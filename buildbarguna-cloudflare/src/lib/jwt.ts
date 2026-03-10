// JWT helpers using Hono's built-in jwt utilities
import { sign, verify } from 'hono/jwt'

export type JWTPayload = {
  sub: string       // user id as string
  phone: string | null
  email: string | null   // NEW: email for login
  role: 'member' | 'admin'
  jti: string       // unique token id for blacklist
  exp: number
}

export async function createToken(
  payload: Omit<JWTPayload, 'exp'>,
  secret: string,
  expiresInDays = 7
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60
  return sign({ ...payload, exp }, secret, 'HS256')
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, secret, 'HS256')
    return payload as JWTPayload
  } catch {
    return null
  }
}

export function generateJti(): string {
  return crypto.randomUUID()
}
