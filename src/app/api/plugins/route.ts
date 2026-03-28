// src/app/api/plugins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

const SIDECAR = process.env.SIDECAR_URL || ''
const SECRET  = process.env.SIDECAR_SECRET || ''

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SIDECAR) return NextResponse.json({ plugins: [] })
  try {
    const res = await fetch(`${SIDECAR}/plugins`, { headers: { 'X-Auth': SECRET }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return NextResponse.json({ plugins: [] })
    return NextResponse.json(await res.json())
  } catch { return NextResponse.json({ plugins: [] }) }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SIDECAR) return NextResponse.json({ error: 'SIDECAR_URL not set' }, { status: 503 })
  const fd   = await req.formData()
  const file = fd.get('plugin') as File
  if (!file || !file.name.endsWith('.jar')) return NextResponse.json({ error: 'Must be a .jar file' }, { status: 400 })
  const buf = await file.arrayBuffer()
  const outFd = new FormData()
  outFd.append('plugin', new Blob([buf]), file.name)
  const res = await fetch(`${SIDECAR}/plugins/upload`, { method: 'POST', headers: { 'X-Auth': SECRET }, body: outFd, signal: AbortSignal.timeout(60000) })
  if (!res.ok) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  return NextResponse.json({ success: true, message: `${file.name} uploaded. Restart to activate.` })
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'No plugin name' }, { status: 400 })
  const res = await fetch(`${SIDECAR}/plugins/delete`, { method: 'POST', headers: { 'X-Auth': SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  if (!res.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}
