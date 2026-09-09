
import { NextRequest, NextResponse } from 'next/server'

import { exigirAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

function respostaNaoAutorizado() {
  return NextResponse.json(
    {
      sucesso: false,
      erro: 'Não autorizado.',
    },
    {
      status: 401,
    },
  )
}

/* =========================================================
   HELPERS
   ========================================================= */

function idSeguro(valor: unknown) {
  const id = String(valor ?? '').trim()

  return id || null
}

/* =========================================================
   POST — MOVIMENTAR ESTOQUE
   ========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    await exigirAdmin()

    const body = await request.json()

    /*
     * IMPORTANTE:
     *
     * Não converter o ID com Number().
     *
     * O ID pode ser UUID/string no banco.
     */
    const id = idSeguro(body?.id)

    const quantidade = Number(body?.quantidade)

    const tipo = String(
      body?.tipo ?? '',
    ).trim().toLowerCase()

    /* =====================================================
       VALIDAR PRODUTO
       ===================================================== */

    if (!id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Produto inválido.',
        },
        {
          status: 400,
        },
      )
    }

    /* =====================================================
       VALIDAR QUANTIDADE
       ===================================================== */

    if (
      !Number.isInteger(quantidade) ||
      quantidade <= 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'A quantidade deve ser um número inteiro maior que zero.',
        },
        {
          status: 400,
        },
      )
    }

    /* =====================================================
       VALIDAR TIPO
       ===================================================== */

    if (
      tipo !== 'entrada' &&
      tipo !== 'saida'
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Tipo de movimentação inválido.',
        },
        {
          status: 400,
        },
      )
    }

    /* =====================================================
       ENTRADA
       ===================================================== */

    if (tipo === 'entrada') {
      const resultado = await sql`
        UPDATE public.products
        SET
          stock = stock + ${quantidade},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING
          id,
          name,
          price,
          stock,
          active,
          updated_at
      `

      if (resultado.length === 0) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: 'Produto não encontrado.',
          },
          {
            status: 404,
          },
        )
      }

      return NextResponse.json({
        sucesso: true,
        produto: resultado[0],
      })
    }

    /* =====================================================
       SAÍDA
       ===================================================== */

    const resultado = await sql`
      UPDATE public.products
      SET
        stock = stock - ${quantidade},
        updated_at = NOW()
      WHERE id = ${id}
        AND stock >= ${quantidade}
      RETURNING
        id,
        name,
        price,
        stock,
        active,
        updated_at
    `

    /* =====================================================
       VERIFICAR RESULTADO DA SAÍDA
       ===================================================== */

    if (resultado.length === 0) {
      const produto = await sql`
        SELECT
          id,
          stock
        FROM public.products
        WHERE id = ${id}
        LIMIT 1
      `

      /* ===================================================
         PRODUTO NÃO EXISTE
         =================================================== */

      if (produto.length === 0) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: 'Produto não encontrado.',
          },
          {
            status: 404,
          },
        )
      }

      /* ===================================================
         ESTOQUE INSUFICIENTE
         =================================================== */

      return NextResponse.json(
        {
          sucesso: false,
          erro: `Estoque insuficiente. Estoque atual: ${produto[0].stock}.`,
        },
        {
          status: 409,
        },
      )
    }

    /* =====================================================
       SUCESSO
       ===================================================== */

    return NextResponse.json({
      sucesso: true,
      produto: resultado[0],
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'UNAUTHORIZED'
    ) {
      return respostaNaoAutorizado()
    }

    console.error(
      'Erro ao movimentar estoque:',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          'Não foi possível atualizar o estoque.',
      },
      {
        status: 500,
      },
    )
  }
}
