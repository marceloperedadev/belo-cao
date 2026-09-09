import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { sql } from './db'

/* =========================================================
   BELO CÃO
   AUTENTICAÇÃO ADMINISTRATIVA
   ========================================================= */

const COOKIE_NAME = 'belocao_admin_session'

const SESSION_DAYS = 7
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60

type AdminUser = {
  id: string
  email: string
  active: boolean
}

type AdminSession = {
  token: string
  adminId: string
  expiresAt: Date
}

/* =========================================================
   CONFIGURAÇÃO DO COOKIE
   ========================================================= */

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */

export function normalizarEmail(email: string) {
  return email.trim().toLowerCase()
}

/* =========================================================
   SENHA
   ========================================================= */

export async function verificarSenha(
  senha: string,
  hash: string,
) {
  return bcrypt.compare(senha, hash)
}

export async function gerarHashSenha(
  senha: string,
) {
  return bcrypt.hash(senha, 12)
}

/* =========================================================
   CRIAR SESSÃO
   ========================================================= */

export async function criarSessao(
  admin: AdminUser,
): Promise<AdminSession> {
  const token = randomBytes(32).toString('hex')

  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE * 1000,
  )

  /*
   * A sessão é armazenada no banco.
   * O navegador recebe apenas o token pelo cookie HttpOnly.
   */

  await sql`
    CREATE TABLE IF NOT EXISTS public.admin_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT NOT NULL UNIQUE,
      admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_token
    ON public.admin_sessions(token)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id
    ON public.admin_sessions(admin_id)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
    ON public.admin_sessions(expires_at)
  `

  await sql`
    INSERT INTO public.admin_sessions (
      token,
      admin_id,
      expires_at
    )
    VALUES (
      ${token},
      ${admin.id},
      ${expiresAt}
    )
  `

  const cookieStore = await cookies()

  cookieStore.set(
    COOKIE_NAME,
    token,
    cookieOptions(),
  )

  return {
    token,
    adminId: admin.id,
    expiresAt,
  }
}

/* =========================================================
   OBTER SESSÃO ATUAL
   ========================================================= */

export async function obterSessao(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies()

    const token = cookieStore.get(
      COOKIE_NAME,
    )?.value

    if (!token) {
      return null
    }

    const resultado = await sql`
      SELECT
        s.admin_id,
        s.expires_at,
        u.id,
        u.email,
        u.active
      FROM public.admin_sessions s
      INNER JOIN public.admin_users u
        ON u.id = s.admin_id
      WHERE s.token = ${token}
      LIMIT 1
    `

    if (resultado.length === 0) {
      return null
    }

    const sessao = resultado[0]

    const expiresAt = new Date(
      String(sessao.expires_at),
    )

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      await sql`
        DELETE FROM public.admin_sessions
        WHERE token = ${token}
      `

      cookieStore.delete(COOKIE_NAME)

      return null
    }

    if (!sessao.active) {
      await sql`
        DELETE FROM public.admin_sessions
        WHERE token = ${token}
      `

      cookieStore.delete(COOKIE_NAME)

      return null
    }

    return {
      id: String(sessao.id),
      email: String(sessao.email),
      active: Boolean(sessao.active),
    }
  } catch (error) {
    console.error(
      '[AUTH] Erro ao obter sessão:',
      error,
    )

    return null
  }
}

/* =========================================================
   EXIGIR ADMIN
   ========================================================= */

export async function exigirAdmin(): Promise<AdminUser> {
  const admin = await obterSessao()

  if (!admin) {
    throw new Error('UNAUTHORIZED')
  }

  return admin
}

/* =========================================================
   ENCERRAR SESSÃO
   ========================================================= */

export async function destruirSessao() {
  const cookieStore = await cookies()

  const token = cookieStore.get(
    COOKIE_NAME,
  )?.value

  if (token) {
    try {
      await sql`
        DELETE FROM public.admin_sessions
        WHERE token = ${token}
      `
    } catch (error) {
      console.error(
        '[AUTH] Erro ao destruir sessão:',
        error,
      )
    }
  }

  cookieStore.delete(COOKIE_NAME)
}

/* =========================================================
   LIMPEZA DE SESSÕES EXPIRADAS
   ========================================================= */

export async function limparSessoesExpiradas() {
  try {
    await sql`
      DELETE FROM public.admin_sessions
      WHERE expires_at <= NOW()
    `
  } catch (error) {
    console.error(
      '[AUTH] Erro ao limpar sessões:',
      error,
    )
  }
}

/* =========================================================
   BUSCAR ADMINISTRADOR POR EMAIL
   ========================================================= */

export async function buscarAdminPorEmail(
  email: string,
): Promise<AdminUser & { password_hash: string } | null> {
  const emailNormalizado = normalizarEmail(email)

  const resultado = await sql`
    SELECT
      id,
      email,
      password_hash,
      active
    FROM public.admin_users
    WHERE LOWER(email) = ${emailNormalizado}
    LIMIT 1
  `

  if (resultado.length === 0) {
    return null
  }

  const admin = resultado[0]

  return {
    id: String(admin.id),
    email: String(admin.email),
    password_hash: String(admin.password_hash),
    active: Boolean(admin.active),
  }
}