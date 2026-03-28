// sidecar/index.js
const express  = require('express')
const fs       = require('fs')
const path     = require('path')
const archiver = require('archiver')
const Busboy   = require('busboy')
const { execSync, exec } = require('child_process')

const app     = express()
const PORT    = 8080
const SECRET  = process.env.SIDECAR_SECRET  || 'changeme'
const DATA    = process.env.DATA_DIR         || '/data'
const PLUGINS = process.env.PLUGINS_DIR      || '/data/plugins'
const PANEL   = process.env.PANEL_API_URL    || ''
const SHUTDOWN_MINS = parseInt(process.env.AUTO_SHUTDOWN_MINUTES || '30')
const RCON_HOST = process.env.RCON_HOST      || '127.0.0.1'
const RCON_PORT = parseInt(process.env.RCON_PORT || '25575')
const RCON_PASS = process.env.RCON_PASSWORD  || 'changeme_rcon'

app.use(express.json({ limit: '10mb' }))

const auth = (req, res, next) => {
  if (req.headers['x-auth'] !== SECRET) return res.status(403).json({ error: 'Forbidden' })
  next()
}

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }))

// ── Disk usage ──────────────────────────────────────────────────────────────
app.get('/disk', auth, (req, res) => {
  try {
    const out = execSync(`df -BG "${DATA}" | tail -1`).toString().trim()
    const parts = out.split(/\s+/)
    const total   = parseInt(parts[1])
    const used    = parseInt(parts[2])
    const percent = parseInt(parts[4])
    res.json({ total, used, percent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── World download ───────────────────────────────────────────────────────────
app.get('/world/download', auth, (req, res) => {
  const worldPath = path.join(DATA, 'world')
  if (!fs.existsSync(worldPath)) return res.status(404).json({ error: 'World not found' })
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="world-${Date.now()}.zip"`)
  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.on('error', err => res.status(500).end())
  archive.pipe(res)
  archive.directory(worldPath, 'world')
  archive.finalize()
})

// ── World upload ─────────────────────────────────────────────────────────────
app.post('/world/upload', auth, (req, res) => {
  const tmp = '/tmp/world-upload.zip'
  const bb = Busboy({ headers: req.headers })
  let ws = null
  bb.on('file', (_f, file) => { ws = fs.createWriteStream(tmp); file.pipe(ws) })
  bb.on('finish', () => {
    if (!ws) return res.status(400).json({ error: 'No file' })
    ws.on('finish', () => {
      try {
        const worldPath = path.join(DATA, 'world')
        if (fs.existsSync(worldPath)) fs.rmSync(worldPath, { recursive: true, force: true })
        fs.mkdirSync(worldPath, { recursive: true })
        execSync(`unzip -o "${tmp}" -d "${worldPath}"`)
        fs.unlinkSync(tmp)
        res.json({ success: true })
      } catch (err) { res.status(500).json({ error: err.message }) }
    })
  })
  req.pipe(bb)
})

// ── List plugins ─────────────────────────────────────────────────────────────
app.get('/plugins', auth, (req, res) => {
  try {
    const jars = fs.readdirSync(PLUGINS).filter(f => f.endsWith('.jar'))
    const plugins = jars.map(f => {
      const name = f.replace('.jar', '')
      // Try to read plugin.yml for version
      let version = null
      try {
        const out = execSync(`unzip -p "${path.join(PLUGINS, f)}" plugin.yml 2>/dev/null | grep "^version:"`, { timeout: 3000 }).toString()
        const m = out.match(/version:\s*(.+)/)
        if (m) version = m[1].trim()
      } catch (_) {}
      return { name, version, enabled: true }
    })
    res.json({ plugins })
  } catch (err) { res.json({ plugins: [] }) }
})

// ── Upload plugin ─────────────────────────────────────────────────────────────
app.post('/plugins/upload', auth, (req, res) => {
  const bb = Busboy({ headers: req.headers })
  bb.on('file', (field, file, info) => {
    const { filename } = info
    if (!filename.endsWith('.jar')) return res.status(400).json({ error: 'Must be .jar' })
    const dest = path.join(PLUGINS, filename)
    const ws = fs.createWriteStream(dest)
    file.pipe(ws)
    ws.on('finish', () => res.json({ success: true }))
  })
  req.pipe(bb)
})

// ── Delete plugin ─────────────────────────────────────────────────────────────
app.post('/plugins/delete', auth, (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'No name' })
  const file = path.join(PLUGINS, `${name}.jar`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' })
  fs.unlinkSync(file)
  res.json({ success: true })
})

// ── Auto-shutdown ─────────────────────────────────────────────────────────────
if (SHUTDOWN_MINS > 0) {
  const THRESHOLD = SHUTDOWN_MINS * 60
  let emptySecs = 0

  // Use RCON to check player count
  const checkPlayers = () => new Promise((resolve) => {
    const net = require('net')
    // Simple RCON packet to send "list" command
    // RCON protocol: length(4) + id(4) + type(4) + payload + 2 null bytes
    const sendRcon = (cmd) => new Promise((res, rej) => {
      const socket = net.createConnection({ host: RCON_HOST, port: RCON_PORT, timeout: 3000 })
      let buf = Buffer.alloc(0)

      socket.on('connect', () => {
        // Auth packet
        const authPayload = Buffer.from(RCON_PASS + '\0\0')
        const authPkt = Buffer.alloc(14 + authPayload.length)
        authPkt.writeInt32LE(10 + authPayload.length, 0)
        authPkt.writeInt32LE(1, 4)
        authPkt.writeInt32LE(3, 8) // type 3 = auth
        authPayload.copy(authPkt, 12)
        socket.write(authPkt)
      })

      let authed = false
      socket.on('data', (data) => {
        buf = Buffer.concat([buf, data])
        if (!authed && buf.length >= 14) {
          authed = true
          // Send command
          const cmdPayload = Buffer.from(cmd + '\0\0')
          const cmdPkt = Buffer.alloc(14 + cmdPayload.length)
          cmdPkt.writeInt32LE(10 + cmdPayload.length, 0)
          cmdPkt.writeInt32LE(2, 4)
          cmdPkt.writeInt32LE(2, 8) // type 2 = command
          cmdPayload.copy(cmdPkt, 12)
          socket.write(cmdPkt)
          buf = Buffer.alloc(0)
        } else if (authed && buf.length >= 14) {
          const len = buf.readInt32LE(0)
          if (buf.length >= len + 4) {
            const response = buf.slice(12, len + 4 - 2).toString('utf8')
            socket.destroy()
            res(response)
          }
        }
      })
      socket.on('error', () => rej(new Error('RCON error')))
      socket.on('timeout', () => { socket.destroy(); rej(new Error('RCON timeout')) })
    })

    sendRcon('list')
      .then(r => {
        const m = r.match(/There are (\d+)/)
        resolve(m ? parseInt(m[1]) : 0)
      })
      .catch(() => resolve(-1)) // -1 = server not reachable
  })

  setInterval(async () => {
    const count = await checkPlayers()
    if (count === -1) return // server not up yet, don't count
    if (count === 0) {
      emptySecs += 60
      console.log(`[AutoShutdown] Empty for ${emptySecs}s / ${THRESHOLD}s`)
      if (emptySecs >= THRESHOLD) {
        console.log('[AutoShutdown] Stopping server...')
        if (PANEL) {
          const http = require(PANEL.startsWith('https') ? 'https' : 'http')
          const body = JSON.stringify({ action: 'stop' })
          const url = new URL(`${PANEL}/api/server`)
          const req = http.request({ hostname: url.hostname, port: url.port || (PANEL.startsWith('https') ? 443 : 80), path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } })
          req.write(body); req.end()
        }
      }
    } else {
      if (emptySecs > 0) console.log(`[AutoShutdown] ${count} player(s) online — timer reset`)
      emptySecs = 0
    }
  }, 60_000)

  console.log(`[AutoShutdown] Active — stops after ${SHUTDOWN_MINS}min empty`)
}

app.listen(PORT, '0.0.0.0', () => console.log(`[Sidecar] :${PORT} ready`))
