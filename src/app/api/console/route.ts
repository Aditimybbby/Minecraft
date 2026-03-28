// src/app/api/console/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { sendRcon } from '@/lib/rcon'

const logs: { time: string; line: string; type: 'info'|'warn'|'error' }[] = []

export function pushLog(line: string) {
  const type = line.includes('ERROR') ? 'error' : line.includes('WARN') ? 'warn' : 'info'
  logs.push({ time: new Date().toISOString(), line, type })
  if (logs.length > 300) logs.shift()
}

// Sidecar pushes logs here
export async function PUT(req: NextRequest) {
  if (req.headers.get('x-auth') !== process.env.SIDECAR_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { lines } = await req.json()
  if (Array.isArray(lines)) lines.forEach(l => pushLog(l))
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const last = parseInt(new URL(req.url).searchParams.get('last') || '100')
  return NextResponse.json({ logs: logs.slice(-last) })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { command } = await req.json()
  if (!command) return NextResponse.json({ error: 'No command' }, { status: 400 })
  pushLog(`> ${command}`)
  const result = await sendRcon(command)
  if (result.response) pushLog(result.response)
  return NextResponse.json(result)
}
