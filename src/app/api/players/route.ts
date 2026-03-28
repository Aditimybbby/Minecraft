// src/app/api/players/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { sendRcon, getPlayers } from '@/lib/rcon'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getPlayers())
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { action, username, message, reason, gamemode } = await req.json()

  const commands: Record<string, string> = {
    op:               `op ${username}`,
    deop:             `deop ${username}`,
    kick:             `kick ${username} ${reason || 'Kicked by admin'}`,
    ban:              `ban ${username} ${reason || 'Banned by admin'}`,
    pardon:           `pardon ${username}`,
    say:              `say ${message}`,
    whitelist_add:    `whitelist add ${username}`,
    whitelist_remove: `whitelist remove ${username}`,
    gamemode:         `gamemode ${gamemode} ${username}`,
    tp_spawn:         `spawn ${username}`,
    clear_inventory:  `clear ${username}`,
  }

  const cmd = commands[action]
  if (!cmd) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  return NextResponse.json(await sendRcon(cmd))
}
