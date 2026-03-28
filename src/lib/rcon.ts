// src/lib/rcon.ts
export interface RconResult {
  success: boolean
  response?: string
  error?: string
}

export async function sendRcon(command: string): Promise<RconResult> {
  const host     = process.env.MC_HOST || 'localhost'
  const port     = parseInt(process.env.RCON_PORT || '25575')
  const password = process.env.RCON_PASSWORD || 'minecraft'

  try {
    const { Rcon } = await import('rcon-client')
    const rcon = new Rcon({ host, port, password, timeout: 6000 })
    await rcon.connect()
    const response = await rcon.send(command)
    await rcon.end()
    return { success: true, response }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getPlayers(): Promise<{ online: number; max: number; players: string[] }> {
  const r = await sendRcon('list')
  if (!r.success || !r.response) return { online: 0, max: 20, players: [] }
  const match = r.response.match(/There are (\d+) of a max of (\d+) players online:(.*)/)
  if (!match) return { online: 0, max: 20, players: [] }
  const players = match[3].trim() ? match[3].trim().split(', ').filter(Boolean) : []
  return { online: parseInt(match[1]), max: parseInt(match[2]), players }
}

export async function isMinecraftOnline(): Promise<boolean> {
  const host = process.env.MC_HOST || 'localhost'
  const port = parseInt(process.env.MC_PORT || '25565')
  return new Promise(resolve => {
    const net = require('net')
    const s = net.createConnection({ host, port, timeout: 3000 })
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('error',   () => resolve(false))
    s.once('timeout', () => { s.destroy(); resolve(false) })
  })
}

// Get disk usage via RCON - runs df command via sidecar
export async function getDiskUsage(): Promise<{ used: number; total: number; percent: number } | null> {
  try {
    const res = await fetch(`${process.env.SIDECAR_URL}/disk`, {
      headers: { 'X-Auth': process.env.SIDECAR_SECRET || '' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
