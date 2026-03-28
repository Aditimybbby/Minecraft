'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr('')
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', password: pw }) })
    const d = await r.json()
    if (d.error) { setErr(d.error); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #0c1f10 0%, var(--bg) 70%)' }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26, boxShadow: '0 8px 32px #22c55e33' }}>⛏️</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>MC Panel</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>Java + Bedrock Server Control</p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={login}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Password</label>
            <input className="input" type="password" placeholder="Enter panel password…" value={pw} onChange={e => setPw(e.target.value)} autoFocus style={{ marginBottom: 14 }} />
            {err && <div style={{ background: 'var(--red-dim)', border: '1px solid #ef444440', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13, marginBottom: 14 }}>{err}</div>}
            <button className="btn btn-green" type="submit" disabled={!pw || loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}>
              {loading ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : '→'} Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
