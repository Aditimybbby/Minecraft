// src/app/api/world/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

const SIDECAR = process.env.SIDECAR_URL || ''
const SECRET  = process.env.SIDECAR_SECRET || ''

export async function GET(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (new URL(req.url).searchParams.get('action') === 'download') {
    if (!SIDECAR) return NextResponse.json({ error: 'SIDECAR_URL not set' }, { status: 503 })
    const res = await fetch(`${SIDECAR}/world/download`, { headers: { 'X-Auth': SECRET }, signal: AbortSignal.timeout(120000) })
    if (!res.ok) return NextResponse.json({ error: 'Sidecar error' }, { status: 500 })
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="world-${Date.now()}.zip"` } })
  }
  return NextResponse.json({ message: 'Use ?action=download' })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SIDECAR) return NextResponse.json({ error: 'SIDECAR_URL not set' }, { status: 503 })
  const fd   = await req.formData()
  const file = fd.get('world') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const buf = await file.arrayBuffer()
  const outFd = new FormData()
  outFd.append('world', new Blob([buf]), file.name)
  const res = await fetch(`${SIDECAR}/world/upload`, { method: 'POST', headers: { 'X-Auth': SECRET }, body: outFd, signal: AbortSignal.timeout(120000) })
  if (!res.ok) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  return NextResponse.json({ success: true, message: 'World uploaded. Restart to apply.' })
}
