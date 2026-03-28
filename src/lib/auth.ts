// src/lib/auth.ts
import { cookies } from 'next/headers'

const COOKIE = 'mc_session'
const VALUE  = 'ok'

export function isAuthenticated(): boolean {
  try {
    return cookies().get(COOKIE)?.value === VALUE
  } catch { return false }
}

export function setAuth() {
  return { name: COOKIE, value: VALUE, options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 7, path: '/' } }
}

export function clearAuth() {
  return { name: COOKIE, value: '', options: { maxAge: 0, path: '/' } }
}
