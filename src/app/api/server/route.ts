// src/app/api/server/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { getServiceStatus, scaleService, redeployService, updateRam, upsertVariable } from '@/lib/railway'
import { isMinecraftOnline, getPlayers, getDiskUsage } from '@/lib/rcon'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [svc, mcOnline] = await Promise.all([getServiceStatus(), isMinecraftOnline()])
    const { replicas, deployStatus, createdAt } = svc

    let status: 'online' | 'offline' | 'starting' | 'stopping'
    if (replicas === 0) status = 'offline'
    else if (['BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED'].includes(deployStatus)) status = 'starting'
    else if (deployStatus === 'SUCCESS' && mcOnline) status = 'online'
    else if (deployStatus === 'SUCCESS' && !mcOnline) status = 'starting'
    else status = 'offline'

    const [players, disk] = await Promise.all([
      status === 'online' ? getPlayers() : Promise.resolve({ online: 0, max: 20, players: [] }),
      getDiskUsage(),
    ])

    const ip   = process.env.MC_HOST || null
    const port = process.env.MC_PORT || '25565'

    return NextResponse.json({ status, deployStatus, replicas, ip, port, players: players.online, maxPlayers: players.max, playerList: players.players, createdAt, disk })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { action, ram, version } = await req.json()

  try {
    // ── RAM change ──────────────────────────────────────────────────
    if (action === 'set_ram') {
      if (!ram) return NextResponse.json({ error: 'No RAM value' }, { status: 400 })
      await updateRam(ram) // updates env var + redeploys
      return NextResponse.json({ success: true, message: `RAM set to ${ram}, redeploying…` })
    }

    // ── Version change ──────────────────────────────────────────────
    if (action === 'set_version') {
      if (!version) return NextResponse.json({ error: 'No version' }, { status: 400 })
      await upsertVariable('MC_VERSION', version)
      return NextResponse.json({ success: true, message: `Version set to ${version}. Restart to apply.` })
    }

    // ── Start ───────────────────────────────────────────────────────
    if (action === 'start') {
      const { replicas } = await getServiceStatus()
      if (replicas === 0) await scaleService(1)
      else await redeployService()
      return NextResponse.json({ success: true })
    }

    // ── Stop ────────────────────────────────────────────────────────
    if (action === 'stop') {
      try {
        const { sendRcon } = await import('@/lib/rcon')
        await sendRcon('save-all')
        await new Promise(r => setTimeout(r, 2000))
        await sendRcon('stop')
        await new Promise(r => setTimeout(r, 3000))
      } catch (_) {}
      await scaleService(0)
      return NextResponse.json({ success: true })
    }

    // ── Restart ─────────────────────────────────────────────────────
    if (action === 'restart') {
      await redeployService()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
