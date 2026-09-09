import { NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

/* =========================================================
   BANCO
   ========================================================= */

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
})

/* =========================================================
   POST — DEVOLVER ESTOQUE MANUALMENTE
   ========================================================= */

export async function POST(
  request: Request,
) {
  const client =
    await pool.connect()

  try {
    const body =
      await request.json()

    const pedidoId =
      body?.pedidoId

    /* =====================================================
       VALIDAÇÃO
       ===================================================== */

    if (
      typeof pedidoId !==
        'string' ||
      !pedidoId.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'ID do pedido não informado.',
        },
        {
          status: 400,
        },
      )
    }

    /* =====================================================
       TRANSAÇÃO
       ===================================================== */

    await client.query(
      'BEGIN',
    )

    /* =====================================================
       BUSCAR PEDIDO COM LOCK
       ===================================================== */

    const pedidoResult =
      await client.query(
        `
          SELECT
            id,
            order_number,
            status,
            stock_restored
          FROM public.orders
          WHERE id = $1
          FOR UPDATE
        `,
        [pedidoId],
      )

    if (
      pedidoResult.rowCount ===
      0
    ) {
      await client.query(
        'ROLLBACK',
      )

      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Pedido não encontrado.',
        },
        {
          status: 404,
        },
      )
    }

    const pedido =
      pedidoResult.rows[0]

    /* =====================================================
       SÓ PEDIDOS CANCELADOS
       ===================================================== */

    if (
      pedido.status !==
      'cancelado'
    ) {
      await client.query(
        'ROLLBACK',
      )

      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Só é possível devolver o estoque de pedidos cancelados.',
        },
        {
          status: 409,
        },
      )
    }

    /* =====================================================
       IMPEDIR DUPLA DEVOLUÇÃO
       ===================================================== */

    if (
      pedido.stock_restored ===
      true
    ) {
      await client.query(
        'ROLLBACK',
      )

      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'O estoque deste pedido já foi devolvido.',
          estoqueDevolvido:
            true,
        },
        {
          status: 409,
        },
      )
    }

    /* =====================================================
       BUSCAR ITENS
       ===================================================== */

    const itensResult =
      await client.query(
        `
          SELECT
            id,
            product_id,
            product_name,
            quantity
          FROM public.order_items
          WHERE order_id = $1
          ORDER BY id
        `,
        [pedidoId],
      )

    if (
      itensResult.rowCount ===
      0
    ) {
      throw new Error(
        'O pedido não possui itens para devolver ao estoque.',
      )
    }

    /* =====================================================
       DEVOLVER CADA ITEM
       ===================================================== */

    const itensDevolvidos: Array<{
      productId: string
      productName: string
      quantity: number
      stockAtual: number
    }> = []

    for (
      const item of
      itensResult.rows
    ) {
      const quantidade =
        Number(
          item.quantity,
        )

      /* ===============================================
         VALIDAR QUANTIDADE
         =============================================== */

      if (
        !Number.isInteger(
          quantidade,
        ) ||
        quantidade <= 0
      ) {
        throw new Error(
          `Quantidade inválida no item ${item.id}.`,
        )
      }

      /* ===============================================
         VALIDAR PRODUTO
         =============================================== */

      if (
        !item.product_id
      ) {
        throw new Error(
          `O item "${item.product_name}" não possui product_id.`,
        )
      }

      /* ===============================================
         DEVOLVER ESTOQUE
         =============================================== */

      const produtoResult =
        await client.query(
          `
            UPDATE public.products
            SET
              stock = stock + $1,
              updated_at = NOW()
            WHERE id = $2
            RETURNING
              id,
              name,
              stock
          `,
          [
            quantidade,
            item.product_id,
          ],
        )

      if (
        produtoResult.rowCount ===
        0
      ) {
        throw new Error(
          `Produto "${item.product_name}" não encontrado.`,
        )
      }

      const produto =
        produtoResult.rows[0]

      itensDevolvidos.push({
        productId:
          produto.id,

        productName:
          produto.name,

        quantity:
          quantidade,

        stockAtual:
          Number(
            produto.stock,
          ),
      })
    }

    /* =====================================================
       MARCAR ESTOQUE COMO DEVOLVIDO
       ===================================================== */

    const updateResult =
      await client.query(
        `
          UPDATE public.orders
          SET
            stock_restored = TRUE,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            order_number,
            status,
            stock_restored,
            updated_at
        `,
        [pedidoId],
      )

    if (
      updateResult.rowCount ===
      0
    ) {
      throw new Error(
        'Não foi possível registrar a devolução do estoque.',
      )
    }

    /* =====================================================
       COMMIT
       ===================================================== */

    await client.query(
      'COMMIT',
    )

    return NextResponse.json({
      sucesso: true,

      mensagem:
        'Produtos devolvidos ao estoque com sucesso.',

      pedido:
        updateResult.rows[0],

      estoqueDevolvido:
        true,

      itens:
        itensDevolvidos,
    })
  } catch (error) {
    /* =====================================================
       ROLLBACK
       ===================================================== */

    try {
      await client.query(
        'ROLLBACK',
      )
    } catch (
      rollbackError
    ) {
      console.error(
        '[POST /api/admin/pedidos/estoque] Erro no rollback:',
        rollbackError,
      )
    }

    console.error(
      '[POST /api/admin/pedidos/estoque]',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,

        mensagem:
          error instanceof Error
            ? error.message
            : 'Erro ao devolver produtos ao estoque.',
      },
      {
        status: 500,
      },
    )
  } finally {
    client.release()
  }
}