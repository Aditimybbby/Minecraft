// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { setAuth, clearAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { action, password } = await req.json()
  if (action === 'login') {
    if (!process.env.PANEL_PASSWORD) return NextResponse.json({ error: 'PANEL_PASSWORD not set' }, { status: 500 })
    if (password !== process.env.PANEL_PASSWORD) return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    const { name, value, options } = setAuth()
    const res = NextResponse.json({ success: true })
    res.cookies.set(name, value, options)
    return res
  }
  if (action === 'logout') {
    const { name, value, options } = clearAuth()
    const res = NextResponse.json({ success: true })
    res.cookies.set(name, value, options)
    return res
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
