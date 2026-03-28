'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServerInfo {
  status: 'online' | 'offline' | 'starting' | 'stopping'
  ip: string | null
  port: string
  players: number
  maxPlayers: number
  playerList: string[]
  createdAt: string | null
  disk: { used: number; total: number; percent: number } | null
}
interface Log { time: string; line: string; type: 'info' | 'warn' | 'error' }
interface Plugin { name: string; version?: string; enabled: boolean }

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  grid:     <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  users:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  sliders:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  globe:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  terminal: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  puzzle:   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  cpu:      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  play:     <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>,
  stop:     <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  refresh:  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  copy:     <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  check:    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  crown:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20l-3-9-4 5-3-9-3 9-4-5z"/></svg>,
  kick:     <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ban:      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  save:     <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  upload:   <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  download: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  trash:    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  logout:   <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  warning:  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info:     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  spin:     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
}

// ─── Tiny components ──────────────────────────────────────────────────────────
function Spinner() { return Ic.spin }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="toggle" onClick={() => onChange(!on)} style={{ background: on ? 'var(--green)' : 'var(--border-hi)' }}>
      <span className="toggle-thumb" style={{ left: on ? 23 : 3 }} />
    </button>
  )
}

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error' | 'info'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [onDone])
  const c = { success: 'var(--green)', error: 'var(--red)', info: 'var(--blue)' }[type]
  return (
    <div className="fade-up" style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: 'var(--bg-elevated)', border: `1px solid ${c}55`, borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 32px ${c}22`, maxWidth: 380 }}>
      <span style={{ color: c, fontSize: 16 }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span style={{ color: 'var(--text-1)', fontWeight: 500, fontSize: 13 }}>{msg}</span>
    </div>
  )
}

function StatCard({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)' }}>{label}</span>
      </div>
      <div className="stat-value" style={{ color: color || 'var(--text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function PropField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function DiskBar({ percent, used, total }: { percent: number; used: number; total: number }) {
  const color = percent > 85 ? 'var(--red)' : percent > 65 ? 'var(--amber)' : 'var(--green)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--text-2)' }}>Disk Usage</span>
        <span style={{ color, fontWeight: 700 }}>{used}GB / {total}GB ({percent}%)</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${Math.min(percent, 100)}%`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
type Tab = 'overview' | 'players' | 'properties' | 'world' | 'plugins' | 'console'

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab]       = useState<Tab>('overview')
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]     = useState<string | null>(null)
  const [toast, setToast]   = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [copied, setCopied] = useState(false)

  // Players
  const [opName, setOpName]         = useState('')
  const [kickName, setKickName]     = useState('')
  const [kickReason, setKickReason] = useState('')
  const [broadcast, setBroadcast]   = useState('')

  // Properties
  const [props, setProps]           = useState<Record<string, string>>({})
  const [dirty, setDirty]           = useState(false)
  const [saving, setSaving]         = useState(false)

  // RAM control
  const [ramChoice, setRamChoice]   = useState('2G')
  const [ramBusy, setRamBusy]       = useState(false)

  // Version control
  const [versionInput, setVersionInput] = useState('')
  const [versionBusy, setVersionBusy]   = useState(false)

  // World
  const [worldFile, setWorldFile]   = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)

  // Plugins
  const [plugins, setPlugins]       = useState<Plugin[]>([])
  const [pluginFile, setPluginFile] = useState<File | null>(null)
  const [pluginUploading, setPluginUploading] = useState(false)

  // Console
  const [logs, setLogs]             = useState<Log[]>([])
  const [cmd, setCmd]               = useState('')
  const consoleEl                   = useRef<HTMLDivElement>(null)

  // ── Polling ───────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/server')
      if (r.status === 401) { router.push('/login'); return }
      setServer(await r.json())
    } catch (_) {}
    setLoading(false)
  }, [router])

  useEffect(() => { fetchStatus(); const id = setInterval(fetchStatus, 6000); return () => clearInterval(id) }, [fetchStatus])

  // Console polling
  useEffect(() => {
    if (tab !== 'console') return
    const pull = async () => {
      try {
        const r = await fetch('/api/console?last=120')
        const d = await r.json()
        setLogs(d.logs || [])
        setTimeout(() => { if (consoleEl.current) consoleEl.current.scrollTop = consoleEl.current.scrollHeight }, 40)
      } catch (_) {}
    }
    pull(); const id = setInterval(pull, 3000); return () => clearInterval(id)
  }, [tab])

  // Load properties
  useEffect(() => {
    if (tab !== 'properties') return
    fetch('/api/properties').then(r => r.json()).then(d => {
      if (d.properties) {
        setProps(d.properties)
        setRamChoice(d.properties.memory || '2G')
        setVersionInput(d.properties.version || '')
      }
    }).catch(() => {})
  }, [tab])

  // Load plugins
  useEffect(() => {
    if (tab !== 'plugins') return
    fetch('/api/plugins').then(r => r.json()).then(d => setPlugins(d.plugins || [])).catch(() => {})
  }, [tab])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toast$ = (msg: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ msg, type })

  const serverAction = async (action: string, extra: Record<string, string> = {}) => {
    setBusy(action)
    try {
      const r = await fetch('/api/server', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
      else toast$(d.message || `${action} initiated`, 'success')
      await fetchStatus()
    } catch (e: any) { toast$(e.message, 'error') }
    setBusy(null)
  }

  const playerAction = async (body: Record<string, string>) => {
    try {
      const r = await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
      else toast$(d.response || 'Done', 'success')
    } catch (e: any) { toast$(e.message, 'error') }
  }

  const sendCmd = async () => {
    if (!cmd.trim()) return
    const c = cmd; setCmd('')
    try {
      const r = await fetch('/api/console', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: c }) })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
    } catch (e: any) { toast$(e.message, 'error') }
  }

  const saveProps = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: props }) })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
      else { toast$('Saved! Restart to apply.', 'success'); setDirty(false) }
    } catch (e: any) { toast$(e.message, 'error') }
    setSaving(false)
  }

  const setProp = (k: string, v: string) => { setProps(p => ({ ...p, [k]: v })); setDirty(true) }

  const changeRam = async () => {
    setRamBusy(true)
    await serverAction('set_ram', { ram: ramChoice })
    setRamBusy(false)
  }

  const changeVersion = async () => {
    if (!versionInput.trim()) return
    setVersionBusy(true)
    await serverAction('set_version', { version: versionInput.trim() })
    setVersionBusy(false)
  }

  const uploadWorld = async () => {
    if (!worldFile) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('world', worldFile)
      const r = await fetch('/api/world', { method: 'POST', body: fd })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
      else { toast$(d.message, 'success'); setWorldFile(null) }
    } catch (e: any) { toast$(e.message, 'error') }
    setUploading(false)
  }

  const uploadPlugin = async () => {
    if (!pluginFile) return
    setPluginUploading(true)
    try {
      const fd = new FormData(); fd.append('plugin', pluginFile)
      const r = await fetch('/api/plugins', { method: 'POST', body: fd })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
      else { toast$(d.message, 'success'); setPluginFile(null); const pr = await fetch('/api/plugins'); const pd = await pr.json(); setPlugins(pd.plugins || []) }
    } catch (e: any) { toast$(e.message, 'error') }
    setPluginUploading(false)
  }

  const deletePlugin = async (name: string) => {
    try {
      const r = await fetch('/api/plugins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const d = await r.json()
      if (d.error) toast$(d.error, 'error')
      else { toast$(`${name} deleted`, 'success'); setPlugins(p => p.filter(x => x.name !== name)) }
    } catch (e: any) { toast$(e.message, 'error') }
  }

  const logout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.push('/login')
  }

  const copyIp = () => {
    if (!server?.ip) return
    navigator.clipboard.writeText(`${server.ip}:${server.port}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const status   = server?.status ?? 'offline'
  const isOnline = status === 'online'
  const isOffline= status === 'offline'
  const isBusy   = !!busy || status === 'starting' || status === 'stopping'

  const uptimeStr = (() => {
    if (!server?.createdAt || !isOnline) return '—'
    const d = Date.now() - new Date(server.createdAt).getTime()
    const h = Math.floor(d / 3_600_000), m = Math.floor((d % 3_600_000) / 60_000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })()

  const statusColor = { online: 'var(--green)', offline: 'var(--text-3)', starting: 'var(--amber)', stopping: 'var(--red)' }[status]
  const statusLabel = { online: 'Online', offline: 'Offline', starting: 'Starting…', stopping: 'Stopping…' }[status]

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',   label: 'Overview',   icon: Ic.grid },
    { id: 'players',    label: 'Players',    icon: Ic.users },
    { id: 'properties', label: 'Properties', icon: Ic.sliders },
    { id: 'world',      label: 'World',      icon: Ic.globe },
    { id: 'plugins',    label: 'Plugins',    icon: Ic.puzzle },
    { id: 'console',    label: 'Console',    icon: Ic.terminal },
  ]

  const QUICK = ['list', 'save-all', 'weather clear', 'time set day', 'gamerule keepInventory true', 'gamerule doDaylightCycle false']

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ height: 58, borderBottom: '1px solid var(--border)', background: 'rgba(7,9,15,0.9)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 4px 16px #22c55e33' }}>⛏️</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', lineHeight: 1.1 }}>MC Panel</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Java + Bedrock</div>
          </div>
        </div>

        {/* Status pill */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 14px' }}>
            <span className={`dot dot-${status}`} />
            <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{statusLabel}</span>
            {isOnline && (
              <><span style={{ color: 'var(--border-hi)', fontSize: 14 }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{server!.players}/{server!.maxPlayers} players</span></>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {server?.ip && (
            <button className="btn btn-ghost" onClick={copyIp} style={{ gap: 7, padding: '7px 13px', fontSize: 12 }}>
              {copied ? Ic.check : Ic.copy}
              <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{copied ? 'Copied!' : `${server.ip}:${server.port}`}</code>
            </button>
          )}
          <button className="btn btn-ghost" onClick={logout} style={{ padding: '7px 13px', gap: 6, fontSize: 12 }}>{Ic.logout} Logout</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 210, borderRight: '1px solid var(--border)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, overflowY: 'auto', background: 'rgba(8,10,18,0.7)' }}>
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`nav-item ${tab === id ? 'active' : ''}`}>
              {icon} {label}
              {id === 'players' && isOnline && (server?.players ?? 0) > 0 && (
                <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 10 }}>{server!.players}</span>
              )}
              {id === 'plugins' && plugins.length > 0 && (
                <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: 10 }}>{plugins.length}</span>
              )}
            </button>
          ))}

          {/* Server controls */}
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-green" disabled={!isOffline || isBusy} onClick={() => serverAction('start')} style={{ justifyContent: 'center', width: '100%' }}>
              {busy === 'start' ? <Spinner /> : Ic.play} Start
            </button>
            <button className="btn btn-red" disabled={!isOnline || isBusy} onClick={() => serverAction('stop')} style={{ justifyContent: 'center', width: '100%' }}>
              {busy === 'stop' ? <Spinner /> : Ic.stop} Stop
            </button>
            <button className="btn btn-amber" disabled={isOffline || isBusy} onClick={() => serverAction('restart')} style={{ justifyContent: 'center', width: '100%' }}>
              {busy === 'restart' ? <Spinner /> : Ic.refresh} Restart
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

          {/* ════ OVERVIEW ════ */}
          {tab === 'overview' && (
            <div className="fade-up">
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>Overview</h1>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>Live server status and resource usage</p>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                <StatCard emoji="📡" label="Status" value={loading ? '…' : statusLabel} color={statusColor} />
                <StatCard emoji="👥" label="Players" value={loading ? '…' : `${server?.players ?? 0}/${server?.maxPlayers ?? 20}`} sub="connected" color={server?.players ? 'var(--blue)' : undefined} />
                <StatCard emoji="⏱" label="Uptime" value={uptimeStr} sub={isOnline ? 'since last start' : 'offline'} />
                <StatCard emoji="🌐" label="Address" value={server?.ip ? server.ip : '—'} sub={server?.ip ? `Port ${server.port}` : 'start server first'} />
              </div>

              {/* RAM + Disk usage row */}
              {(isOnline || server?.disk) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  {/* RAM control */}
                  <div className="card" style={{ padding: 22 }}>
                    <div className="section-label">🧠 RAM Allocation</div>
                    <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 14 }}>
                      Changing RAM triggers an automatic redeploy. Server will restart.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="input" value={ramChoice} onChange={e => setRamChoice(e.target.value)} style={{ flex: 1 }}>
                        <option value="512M">512 MB (very low)</option>
                        <option value="1G">1 GB</option>
                        <option value="2G">2 GB (recommended)</option>
                        <option value="3G">3 GB</option>
                        <option value="4G">4 GB</option>
                        <option value="6G">6 GB</option>
                        <option value="8G">8 GB</option>
                      </select>
                      <button className="btn btn-amber" onClick={changeRam} disabled={ramBusy} style={{ flexShrink: 0 }}>
                        {ramBusy ? <Spinner /> : Ic.cpu} Apply
                      </button>
                    </div>
                  </div>

                  {/* Disk usage */}
                  <div className="card" style={{ padding: 22 }}>
                    <div className="section-label">💾 Disk Usage</div>
                    {server?.disk ? (
                      <>
                        <DiskBar percent={server.disk.percent} used={server.disk.used} total={server.disk.total} />
                        <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 12 }}>
                          To resize storage: Railway Dashboard → MC Server service → Volumes → Edit size
                        </p>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                        Disk info available when server is online
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Starting banner */}
              {status === 'starting' && (
                <div className="card" style={{ padding: 22, marginBottom: 20, borderColor: '#f59e0b30' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Spinner />
                    <span style={{ fontWeight: 700, color: 'var(--amber)' }}>Server is booting up</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>· Usually takes 30–90 seconds</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }} className="indeterminate" />
                </div>
              )}

              {/* Geyser info */}
              {isOnline && (
                <div className="card" style={{ padding: 20, marginBottom: 20, borderColor: '#38bdf820', background: 'rgba(56,189,248,0.03)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--blue)', marginTop: 1 }}>{Ic.info}</span>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                      <strong style={{ color: 'var(--text-1)' }}>Bedrock players:</strong> Connect using the same IP and port via Geyser. Java players use port <code style={{ fontFamily: 'var(--mono)' }}>{server?.port}</code>, Bedrock players use port <code style={{ fontFamily: 'var(--mono)' }}>19132</code> on the same address.
                    </div>
                  </div>
                </div>
              )}

              {/* Player chips */}
              {isOnline && server?.playerList && server.playerList.length > 0 && (
                <div className="card" style={{ padding: 22, marginBottom: 20 }}>
                  <div className="section-label">Online Players</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {server.playerList.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 99, padding: '6px 14px' }}>
                        <img src={`https://mc-heads.net/avatar/${p}/20`} alt={p} width={20} height={20} style={{ borderRadius: 4, imageRendering: 'pixelated' }} onError={(e: any) => { e.target.style.display = 'none' }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p}</span>
                        <span className="dot dot-online" style={{ width: 6, height: 6 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline splash */}
              {isOffline && (
                <div className="card" style={{ padding: 52, textAlign: 'center', borderStyle: 'dashed' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🌿</div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>Server is offline</h2>
                  <p style={{ color: 'var(--text-2)', marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>World is safely stored on a Railway volume. Hit start to spin it up.</p>
                  <button className="btn btn-green" disabled={isBusy} onClick={() => serverAction('start')} style={{ fontSize: 14, padding: '12px 32px' }}>
                    {busy === 'start' ? <Spinner /> : Ic.play} Start Server
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ PLAYERS ════ */}
          {tab === 'players' && (
            <div className="fade-up">
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>Players</h1>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>Manage operators, kick, ban, whitelist, and broadcast</p>
              {!isOnline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-dim)', border: '1px solid #f59e0b33', borderRadius: 10, padding: '12px 16px', marginBottom: 22, color: 'var(--amber)', fontSize: 13 }}>
                  {Ic.warning} Server must be online to send player commands
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* OP */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">⭐ Operator Access</div>
                  <input className="input" placeholder="Username" value={opName} onChange={e => setOpName(e.target.value)} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-green" style={{ flex: 1, justifyContent: 'center' }} disabled={!opName || !isOnline} onClick={() => { playerAction({ action: 'op', username: opName }); setOpName('') }}>{Ic.crown} Make OP</button>
                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} disabled={!opName || !isOnline} onClick={() => { playerAction({ action: 'deop', username: opName }); setOpName('') }}>Remove OP</button>
                  </div>
                </div>

                {/* Kick / Ban */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">🚫 Kick / Ban</div>
                  <input className="input" placeholder="Username" value={kickName} onChange={e => setKickName(e.target.value)} style={{ marginBottom: 8 }} />
                  <input className="input" placeholder="Reason (optional)" value={kickReason} onChange={e => setKickReason(e.target.value)} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-amber" style={{ flex: 1, justifyContent: 'center' }} disabled={!kickName || !isOnline} onClick={() => { playerAction({ action: 'kick', username: kickName, reason: kickReason }); setKickName(''); setKickReason('') }}>{Ic.kick} Kick</button>
                    <button className="btn btn-red" style={{ flex: 1, justifyContent: 'center' }} disabled={!kickName || !isOnline} onClick={() => { playerAction({ action: 'ban', username: kickName, reason: kickReason }); setKickName(''); setKickReason('') }}>{Ic.ban} Ban</button>
                  </div>
                </div>

                {/* Broadcast */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">📢 Broadcast</div>
                  <input className="input" placeholder="Message to all players…" value={broadcast} onChange={e => setBroadcast(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && broadcast && isOnline) { playerAction({ action: 'say', message: broadcast }); setBroadcast('') }}} style={{ marginBottom: 10 }} />
                  <button className="btn btn-blue" style={{ width: '100%', justifyContent: 'center' }} disabled={!broadcast || !isOnline} onClick={() => { playerAction({ action: 'say', message: broadcast }); setBroadcast('') }}>Send to All</button>
                </div>

                {/* Online players */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">👥 Currently Online</div>
                  {isOnline && server?.playerList && server.playerList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {server.playerList.map(p => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-elevated)', borderRadius: 9, padding: '9px 13px' }}>
                          <img src={`https://mc-heads.net/avatar/${p}/20`} alt={p} width={20} height={20} style={{ borderRadius: 4, imageRendering: 'pixelated' }} onError={(e: any) => { e.target.style.display = 'none' }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p}</span>
                          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => playerAction({ action: 'kick', username: p, reason: 'Kicked by admin' })}>Kick</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 13 }}>{isOnline ? 'No players online' : 'Server offline'}</div>
                  )}
                </div>

                {/* Pardon + Whitelist */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">✅ Pardon / Whitelist</div>
                  <input className="input" id="extra-input" placeholder="Username" style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[{ action: 'pardon', label: 'Unban', cls: 'btn-blue' }, { action: 'whitelist_add', label: 'Whitelist +', cls: 'btn-green' }, { action: 'whitelist_remove', label: 'Whitelist −', cls: 'btn-ghost' }].map(({ action, label, cls }) => (
                      <button key={action} className={`btn ${cls}`} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} disabled={!isOnline}
                        onClick={() => { const el = document.getElementById('extra-input') as HTMLInputElement; if (el?.value) { playerAction({ action, username: el.value }); el.value = '' } }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gamemode */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">🎮 Set Gamemode</div>
                  <input className="input" id="gm-player" placeholder="Username" style={{ marginBottom: 8 }} />
                  <select className="input" id="gm-mode" style={{ marginBottom: 10 }}>
                    <option value="survival">Survival</option>
                    <option value="creative">Creative</option>
                    <option value="adventure">Adventure</option>
                    <option value="spectator">Spectator</option>
                  </select>
                  <button className="btn btn-purple" style={{ width: '100%', justifyContent: 'center' }} disabled={!isOnline}
                    onClick={() => {
                      const p = (document.getElementById('gm-player') as HTMLInputElement)?.value
                      const m = (document.getElementById('gm-mode') as HTMLSelectElement)?.value
                      if (p && m) playerAction({ action: 'gamemode', username: p, gamemode: m })
                    }}>
                    Set Gamemode
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ PROPERTIES ════ */}
          {tab === 'properties' && (
            <div className="fade-up">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>Properties</h1>
                  <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Saved as Railway env vars · Restart server to apply</p>
                </div>
                {dirty && <button className="btn btn-green" onClick={saveProps} disabled={saving}>{saving ? <Spinner /> : Ic.save} Save Changes</button>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* Version + RAM */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">🖥️ Server Software</div>
                  <PropField label="Minecraft Version" hint="e.g. 1.21.1 or latest">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="input" value={versionInput} onChange={e => setVersionInput(e.target.value)} placeholder="latest" style={{ flex: 1 }} />
                      <button className="btn btn-amber" onClick={changeVersion} disabled={versionBusy || !versionInput} style={{ flexShrink: 0 }}>
                        {versionBusy ? <Spinner /> : Ic.save} Set
                      </button>
                    </div>
                  </PropField>
                  <PropField label="RAM Allocation" hint="Applies on next restart">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="input" value={ramChoice} onChange={e => setRamChoice(e.target.value)} style={{ flex: 1 }}>
                        <option value="512M">512 MB</option>
                        <option value="1G">1 GB</option>
                        <option value="2G">2 GB</option>
                        <option value="3G">3 GB</option>
                        <option value="4G">4 GB</option>
                        <option value="6G">6 GB</option>
                        <option value="8G">8 GB</option>
                      </select>
                      <button className="btn btn-amber" onClick={changeRam} disabled={ramBusy} style={{ flexShrink: 0 }}>
                        {ramBusy ? <Spinner /> : Ic.cpu} Apply
                      </button>
                    </div>
                  </PropField>
                  <PropField label="MOTD (Server name)">
                    <input className="input" value={props.motd || ''} onChange={e => setProp('motd', e.target.value)} placeholder="A Minecraft Server" />
                  </PropField>
                  <PropField label="Max Players">
                    <input className="input" type="number" min="1" max="100" value={props.maxPlayers || '20'} onChange={e => setProp('maxPlayers', e.target.value)} />
                  </PropField>
                </div>

                {/* World */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">🌍 World</div>
                  <PropField label="Seed" hint="Blank = random">
                    <input className="input" value={props.seed || ''} onChange={e => setProp('seed', e.target.value)} placeholder="Leave blank for random" />
                  </PropField>
                  <PropField label="Level Type">
                    <select className="input" value={props.levelType || 'minecraft:normal'} onChange={e => setProp('levelType', e.target.value)}>
                      <option value="minecraft:normal">Default</option>
                      <option value="minecraft:flat">Superflat</option>
                      <option value="minecraft:large_biomes">Large Biomes</option>
                      <option value="minecraft:amplified">Amplified</option>
                    </select>
                  </PropField>
                  <PropField label="Difficulty">
                    <select className="input" value={props.difficulty || 'normal'} onChange={e => setProp('difficulty', e.target.value)}>
                      <option value="peaceful">Peaceful</option>
                      <option value="easy">Easy</option>
                      <option value="normal">Normal</option>
                      <option value="hard">Hard</option>
                    </select>
                  </PropField>
                  <PropField label="Default Gamemode">
                    <select className="input" value={props.gamemode || 'survival'} onChange={e => setProp('gamemode', e.target.value)}>
                      <option value="survival">Survival</option>
                      <option value="creative">Creative</option>
                      <option value="adventure">Adventure</option>
                    </select>
                  </PropField>
                  <PropField label="View Distance (chunks)">
                    <input className="input" type="number" min="2" max="32" value={props.viewDistance || '10'} onChange={e => setProp('viewDistance', e.target.value)} />
                  </PropField>
                </div>

                {/* Toggles */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">🔧 Toggles</div>
                  {[
                    { k: 'pvp',                label: 'PvP',               hint: 'Player vs Player' },
                    { k: 'hardcore',           label: 'Hardcore Mode',     hint: 'Death = ban' },
                    { k: 'allowFlight',        label: 'Allow Flight',      hint: 'No kick for flying' },
                    { k: 'spawnMonsters',      label: 'Spawn Monsters' },
                    { k: 'spawnAnimals',       label: 'Spawn Animals' },
                    { k: 'onlineMode',         label: 'Online Mode',       hint: 'Require paid account' },
                    { k: 'enableCommandBlock', label: 'Command Blocks' },
                    { k: 'whitelistEnabled',   label: 'Whitelist',         hint: 'Only allow listed players' },
                  ].map(({ k, label, hint }) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                        {hint && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</div>}
                      </div>
                      <Toggle on={props[k] === 'true'} onChange={v => setProp(k, String(v))} />
                    </div>
                  ))}
                </div>

                {/* Auto-shutdown */}
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">⏰ Auto-Shutdown</div>
                  <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 16, lineHeight: 1.7 }}>Stops server after N minutes with no players. Saves Railway costs.</p>
                  <PropField label="Minutes until shutdown" hint="0 = disabled">
                    <input className="input" type="number" min="0" value={props.autoShutdown || '30'} onChange={e => setProp('autoShutdown', e.target.value)} />
                  </PropField>
                  <div style={{ background: 'var(--green-dim)', border: '1px solid #22c55e20', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>
                    💡 Recommended: 30 minutes. Saves ~70% on Railway costs for casual play.
                  </div>
                </div>
              </div>

              {dirty && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-green" onClick={saveProps} disabled={saving} style={{ fontSize: 14, padding: '12px 28px' }}>
                    {saving ? <Spinner /> : Ic.save} Save All Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ WORLD ════ */}
          {tab === 'world' && (
            <div className="fade-up">
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>World</h1>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>Download backups or replace your world</p>
              {!isOffline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-dim)', border: '1px solid #f59e0b33', borderRadius: 10, padding: '12px 16px', marginBottom: 22, color: 'var(--amber)', fontSize: 13 }}>
                  {Ic.warning} Stop the server before uploading a world to avoid data corruption
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💾</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Download World</h3>
                    <p style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.7 }}>Full backup of your world as a .zip file including all dimensions and player data.</p>
                  </div>
                  <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.open('/api/world?action=download', '_blank')}>
                    {Ic.download} Download world.zip
                  </button>
                </div>
                <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📤</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Upload World</h3>
                    <p style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.7 }}>Replace current world with a .zip file. Stop server first.</p>
                  </div>
                  <label style={{ width: '100%', cursor: 'pointer' }}>
                    <div style={{ border: `2px dashed ${worldFile ? 'var(--green)' : 'var(--border-hi)'}`, borderRadius: 10, padding: 20, background: worldFile ? 'var(--green-dim)' : 'transparent', transition: 'all 0.2s', textAlign: 'center' }}>
                      {worldFile ? <div style={{ color: 'var(--green)' }}><div style={{ fontWeight: 700, marginBottom: 2 }}>{worldFile.name}</div><div style={{ fontSize: 11, color: 'var(--text-2)' }}>{(worldFile.size / 1048576).toFixed(1)} MB</div></div>
                        : <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Click to select world.zip</div>}
                    </div>
                    <input type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setWorldFile(e.target.files?.[0] || null)} />
                  </label>
                  <button className="btn btn-blue" style={{ width: '100%', justifyContent: 'center' }} disabled={!worldFile || uploading} onClick={uploadWorld}>
                    {uploading ? <Spinner /> : Ic.upload} {uploading ? 'Uploading…' : 'Upload World'}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 18, background: 'var(--blue-dim)', border: '1px solid #38bdf820', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--blue)', marginTop: 1 }}>{Ic.info}</span>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  <strong style={{ color: 'var(--text-1)' }}>To increase storage:</strong> Go to Railway Dashboard → MC Server service → Volumes → click the volume → Edit size. You can increase it any time without losing data.
                </div>
              </div>
            </div>
          )}

          {/* ════ PLUGINS ════ */}
          {tab === 'plugins' && (
            <div className="fade-up">
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>Plugins</h1>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>Manage PaperMC plugins. Geyser and Floodgate are pre-installed.</p>

              {/* Pre-installed */}
              <div className="card" style={{ padding: 20, marginBottom: 20, borderColor: '#22c55e20' }}>
                <div className="section-label">📦 Pre-installed Plugins</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { name: 'Geyser', desc: 'Bedrock players can join', color: 'var(--blue)' },
                    { name: 'Floodgate', desc: 'Xbox account auth for Bedrock', color: 'var(--blue)' },
                    { name: 'ViaVersion', desc: 'Newer clients on older server', color: 'var(--purple)' },
                    { name: 'ViaBackwards', desc: 'Older clients on newer server', color: 'var(--purple)' },
                  ].map(({ name, desc, color }) => (
                    <div key={name} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
                      <span className="badge badge-green" style={{ marginTop: 6 }}>Active</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload */}
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <div className="section-label">⬆️ Upload Plugin</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ flex: 1, cursor: 'pointer' }}>
                    <div style={{ border: `2px dashed ${pluginFile ? 'var(--green)' : 'var(--border-hi)'}`, borderRadius: 10, padding: '14px 20px', background: pluginFile ? 'var(--green-dim)' : 'transparent', transition: 'all 0.2s' }}>
                      {pluginFile ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>{pluginFile.name}</span>
                        : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Select a .jar plugin file…</span>}
                    </div>
                    <input type="file" accept=".jar" style={{ display: 'none' }} onChange={e => setPluginFile(e.target.files?.[0] || null)} />
                  </label>
                  <button className="btn btn-green" disabled={!pluginFile || pluginUploading} onClick={uploadPlugin} style={{ flexShrink: 0 }}>
                    {pluginUploading ? <Spinner /> : Ic.upload} Upload
                  </button>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 10 }}>Restart server after uploading for plugin to activate.</p>
              </div>

              {/* Plugin list */}
              {plugins.length > 0 ? (
                <div className="card" style={{ padding: 24 }}>
                  <div className="section-label">📋 Installed Plugins</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {plugins.map(p => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-elevated)', borderRadius: 9, padding: '10px 14px' }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                        {p.version && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>v{p.version}</span>}
                        <span className={`badge ${p.enabled ? 'badge-green' : 'badge-amber'}`}>{p.enabled ? 'Enabled' : 'Disabled'}</span>
                        <button className="btn btn-red" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => deletePlugin(p.name)}>{Ic.trash}</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No custom plugins installed yet</div>
                </div>
              )}
            </div>
          )}

          {/* ════ CONSOLE ════ */}
          {tab === 'console' && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>Console</h1>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 18 }}>Live server output and command sender via RCON</p>
              <div className="console-wrap" ref={consoleEl} style={{ flex: 1, minHeight: 320, maxHeight: 440, marginBottom: 12 }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-3)', textAlign: 'center', paddingTop: 40, fontSize: 12 }}>
                    {isOnline ? 'Waiting for log output…' : 'Server is offline — start it to see logs'}
                  </div>
                ) : logs.map((l, i) => (
                  <div key={i} className={`log-${l.type}`} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--text-3)', flexShrink: 0, fontSize: 10, userSelect: 'none' }}>{new Date(l.time).toLocaleTimeString()}</span>
                    <span style={{ wordBreak: 'break-all' }}>{l.line}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder={isOnline ? 'Enter command… (e.g. time set day)' : 'Server offline'} value={cmd} disabled={!isOnline} onChange={e => setCmd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendCmd() }} style={{ fontFamily: 'var(--mono)', fontSize: 12 }} />
                <button className="btn btn-green" disabled={!cmd.trim() || !isOnline} onClick={sendCmd}>Run</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center', marginRight: 4 }}>Quick:</span>
                {QUICK.map(c => (
                  <button key={c} className="btn btn-ghost" disabled={!isOnline} style={{ fontSize: 11, padding: '4px 11px', fontFamily: 'var(--mono)' }} onClick={() => { setCmd(c); setTimeout(sendCmd, 50) }}>{c}</button>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
