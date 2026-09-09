import { NextRequest, NextResponse } from 'next/server'

import {
  buscarAdminPorEmail,
  criarSessao,
  verificarSenha,
} from '@/lib/auth'

/* =========================================================
   BELO CÃO
   LOGIN ADMINISTRATIVO
   ========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json()

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : ''

    const senha =
      typeof body.senha === 'string'
        ? body.senha
        : ''

    /* =====================================================
       VALIDAÇÃO
       ===================================================== */

    if (!email || !senha) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Informe o e-mail e a senha.',
        },
        {
          status: 400,
        },
      )
    }

    if (email.length > 254) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'E-mail inválido.',
        },
        {
          status: 400,
        },
      )
    }

    if (senha.length > 200) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Credenciais inválidas.',
        },
        {
          status: 401,
        },
      )
    }

    /* =====================================================
       BUSCAR ADMIN
       ===================================================== */

    const admin =
      await buscarAdminPorEmail(email)

    /*
     * Não informamos se o e-mail existe.
     * Isso evita facilitar enumeração de usuários.
     */

    if (!admin) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'E-mail ou senha inválidos.',
        },
        {
          status: 401,
        },
      )
    }

    if (!admin.active) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'E-mail ou senha inválidos.',
        },
        {
          status: 401,
        },
      )
    }

    /* =====================================================
       VERIFICAR SENHA
       ===================================================== */

    const senhaCorreta =
      await verificarSenha(
        senha,
        admin.password_hash,
      )

    if (!senhaCorreta) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'E-mail ou senha inválidos.',
        },
        {
          status: 401,
        },
      )
    }

    /* =====================================================
       CRIAR SESSÃO
       ===================================================== */

    await criarSessao({
      id: admin.id,
      email: admin.email,
      active: admin.active,
    })

    return NextResponse.json(
      {
        sucesso: true,
        administrador: {
          id: admin.id,
          email: admin.email,
        },
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      '[ADMIN LOGIN]',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Não foi possível realizar o login.',
      },
      {
        status: 500,
      },
    )
  }
}