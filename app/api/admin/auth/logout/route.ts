import { NextResponse } from 'next/server'

import {
  destruirSessao,
} from '@/lib/auth'

/* =========================================================
   BELO CÃO
   LOGOUT ADMINISTRATIVO
   ========================================================= */

export async function POST() {
  try {
    await destruirSessao()

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: 'Sessão encerrada.',
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      '[ADMIN LOGOUT]',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Não foi possível encerrar a sessão.',
      },
      {
        status: 500,
      },
    )
  }
}