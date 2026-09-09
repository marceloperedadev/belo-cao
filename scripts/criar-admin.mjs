import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não foi configurada.')
}

const sql = neon(process.env.DATABASE_URL)

const rl = readline.createInterface({
  input,
  output,
})

try {
  const email = (
    await rl.question('E-mail do administrador: ')
  )
    .trim()
    .toLowerCase()

  const senha = await rl.question(
    'Senha do administrador: ',
  )

  if (!email || !senha) {
    throw new Error(
      'E-mail e senha são obrigatórios.',
    )
  }

  if (senha.length < 8) {
    throw new Error(
      'A senha precisa ter pelo menos 8 caracteres.',
    )
  }

  const passwordHash = await bcrypt.hash(
    senha,
    12,
  )

  const existente = await sql`
    SELECT id
    FROM public.admin_users
    WHERE LOWER(email) = ${email}
    LIMIT 1
  `

  if (existente.length > 0) {
    throw new Error(
      'Já existe um administrador com esse e-mail.',
    )
  }

  const resultado = await sql`
    INSERT INTO public.admin_users (
      email,
      password_hash,
      active
    )
    VALUES (
      ${email},
      ${passwordHash},
      TRUE
    )
    RETURNING id, email, active
  `

  console.log('')
  console.log('====================================')
  console.log(' ADMINISTRADOR CRIADO COM SUCESSO')
  console.log('====================================')
  console.log('')
  console.log(`ID: ${resultado[0].id}`)
  console.log(`E-mail: ${resultado[0].email}`)
  console.log(`Ativo: ${resultado[0].active}`)
  console.log('')
} catch (error) {
  console.error('')
  console.error(
    'Erro:',
    error instanceof Error
      ? error.message
      : error,
  )
  console.error('')
  process.exitCode = 1
} finally {
  rl.close()
}