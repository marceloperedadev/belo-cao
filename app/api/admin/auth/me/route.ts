import { NextResponse } from 'next/server'

import {
  obterSessao,
} from '@/lib/auth'

/* =========================================================
   BELO CÃO
   USUÁRIO ADMINISTRATIVO ATUAL
   ========================================================= */

export async function GET() {
  try {
    const admin = await obterSessao()

    if (!admin) {
      return NextResponse.json(
        {
          autenticado: false,
          administrador: null,
        },
        {
          status: 401,
        },
      )
    }

    return NextResponse.json(
      {
        autenticado: true,
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
      '[ADMIN ME]',
      error,
    )

    return NextResponse.json(
      {
        autenticado: false,
        administrador: null,
      },
      {
        status: 401,
      },
    )
  }
}