'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { sql, type User } from './db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'medsync-pro-secret-key-change-in-production'
)

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_SECRET || 'medsync-pro-refresh-secret-change-in-production'
)

export type SessionUser = Omit<User, 'password_hash'>

// ===== Password Helpers =====

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function validatePasswordStrength(password: string): Promise<{ valid: boolean; error?: string }> {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must include at least one letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least one number' }
  }
  return { valid: true }
}

// ===== Token Helpers =====

export async function createAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET)
}

export async function createRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ id: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<{ id: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET)
    if (payload.type !== 'refresh') return null
    return { id: payload.id as string }
  } catch {
    return null
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ===== Session Management =====

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access-token')?.value
  if (token) {
    const user = await verifyAccessToken(token)
    if (user) return user
  }

  // Try refresh token if access token expired
  const refreshToken = cookieStore.get('refresh-token')?.value
  if (!refreshToken) return null

  const refreshPayload = await verifyRefreshToken(refreshToken)
  if (!refreshPayload) return null

  // Verify refresh token is still valid in DB
  const tokenHash = hashToken(refreshToken)
  const tokens = await sql`
    SELECT id FROM refresh_tokens 
    WHERE user_id = ${refreshPayload.id} 
      AND token_hash = ${tokenHash} 
      AND revoked = FALSE 
      AND expires_at > NOW()
  `
  if (tokens.length === 0) return null

  // Get user and refresh access token
  const users = await sql`
    SELECT id, email, name, role, is_active, last_login_at, created_at, updated_at 
    FROM users 
    WHERE id = ${refreshPayload.id} AND is_active = TRUE
  `
  if (users.length === 0) return null

  const sessionUser = users[0] as SessionUser
  await setAccessTokenCookie(sessionUser)
  return sessionUser
}

async function setAccessTokenCookie(user: SessionUser): Promise<void> {
  const token = await createAccessToken(user)
  const cookieStore = await cookies()
  cookieStore.set('access-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  })
}

export async function setSession(user: SessionUser): Promise<void> {
  const refreshToken = await createRefreshToken(user.id)
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
  `

  const cookieStore = await cookies()
  cookieStore.set('refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  await setAccessTokenCookie(user)
}

export async function clearSession(allDevices = false): Promise<void> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh-token')?.value

  if (refreshToken) {
    if (allDevices) {
      const payload = await verifyRefreshToken(refreshToken)
      if (payload) {
        await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ${payload.id}`
      }
    } else {
      const tokenHash = hashToken(refreshToken)
      await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ${tokenHash}`
    }
  }

  cookieStore.delete('access-token')
  cookieStore.delete('refresh-token')
}

// ===== User Management =====

export async function authenticateUser(email: string, password: string): Promise<{ user: SessionUser | null; error?: string }> {
  const users = await sql`
    SELECT id, email, password_hash, name, role, is_active, last_login_at, created_at, updated_at 
    FROM users 
    WHERE email = ${email}
  `

  if (users.length === 0) return { user: null, error: 'invalid' }

  const user = users[0] as User

  if (!user.is_active) {
    return { user: null, error: 'deactivated' }
  }

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) return { user: null, error: 'invalid' }

  // Update last login
  await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`

  const { password_hash: _, ...sessionUser } = user
  return { user: sessionUser as SessionUser }
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: User['role']
): Promise<SessionUser> {
  const passwordHash = await hashPassword(password)

  const result = await sql`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (${email}, ${passwordHash}, ${name}, ${role}, TRUE)
    RETURNING id, email, name, role, is_active, last_login_at, created_at, updated_at
  `

  return result[0] as SessionUser
}

// ===== Activity Logging =====

export async function logActivity(
  userId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null
    const userAgent = headersList.get('user-agent') || null

    await sql`
      INSERT INTO user_activity_logs (user_id, action, details, ip_address, user_agent)
      VALUES (${userId}, ${action}, ${details ? JSON.stringify(details) : null}, ${ipAddress}, ${userAgent})
    `
  } catch (error) {
    console.error('[pharmasync-track] Activity log error:', error)
  }
}

// ===== Password Reset =====

export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate previous unused tokens
  await sql`
    UPDATE password_resets 
    SET used = TRUE 
    WHERE user_id = ${userId} AND used = FALSE
  `

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await sql`
    INSERT INTO password_resets (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `

  return token
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token)
  const resets = await sql`
    SELECT user_id FROM password_resets 
    WHERE token_hash = ${tokenHash} 
      AND used = FALSE 
      AND expires_at > NOW()
    LIMIT 1
  `
  if (resets.length === 0) return null
  return resets[0].user_id as string
}

export async function consumePasswordResetToken(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  await sql`
    UPDATE password_resets 
    SET used = TRUE 
    WHERE token_hash = ${tokenHash}
  `
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword)
  await sql`
    UPDATE users 
    SET password_hash = ${passwordHash}, updated_at = NOW() 
    WHERE id = ${userId}
  `
  // Revoke all refresh tokens for security
  await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ${userId}`
}

// ===== Authorization Helpers =====

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.role !== 'admin') throw new Error('FORBIDDEN')
  return session
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}
