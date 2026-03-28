// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { getServiceVariables, upsertVariable } from '@/lib/railway'

const MAP: Record<string, string> = {
  version:            'MC_VERSION',
  memory:             'MC_MEMORY',
  seed:               'MC_SEED',
  difficulty:         'MC_DIFFICULTY',
  gamemode:           'MC_GAMEMODE',
  maxPlayers:         'MC_MAX_PLAYERS',
  pvp:                'MC_PVP',
  allowFlight:        'MC_ALLOW_FLIGHT',
  viewDistance:       'MC_VIEW_DISTANCE',
  motd:               'MC_MOTD',
  hardcore:           'MC_HARDCORE',
  spawnMonsters:      'MC_SPAWN_MONSTERS',
  spawnAnimals:       'MC_SPAWN_ANIMALS',
  onlineMode:         'MC_ONLINE_MODE',
  enableCommandBlock: 'MC_ENABLE_COMMAND_BLOCK',
  levelType:          'MC_LEVEL_TYPE',
  autoShutdown:       'AUTO_SHUTDOWN_MINUTES',
  rconPassword:       'RCON_PASSWORD',
  whitelistEnabled:   'MC_WHITELIST',
}

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const vars = await getServiceVariables()
    const properties: Record<string, string> = {}
    for (const [prop, envKey] of Object.entries(MAP)) {
      properties[prop] = vars[envKey] ?? ''
    }
    return NextResponse.json({ properties })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { properties } = await req.json()
    await Promise.all(
      Object.entries(properties)
        .filter(([prop, value]) => MAP[prop] && value !== undefined && value !== '')
        .map(([prop, value]) => upsertVariable(MAP[prop], String(value)))
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
