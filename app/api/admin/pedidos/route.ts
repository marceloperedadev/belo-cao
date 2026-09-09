import { NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

/* =========================================================
   BANCO
   ========================================================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

/* =========================================================
   STATUS
   ========================================================= */

const STATUS_VALIDOS = [
  'recebido',
  'confirmado',
  'em_preparo',
  'saiu_para_entrega',
  'concluido',
  'cancelado',
] as const

type StatusPedido = (typeof STATUS_VALIDOS)[number]

/* =========================================================
   TRANSIÇÕES PERMITIDAS
   ========================================================= */

const TRANSICOES_STATUS: Record<
  StatusPedido,
  StatusPedido[]
> = {
  recebido: [
    'confirmado',
    'cancelado',
  ],

  confirmado: [
    'em_preparo',
    'cancelado',
  ],

  em_preparo: [
    'saiu_para_entrega',
    'cancelado',
  ],

  saiu_para_entrega: [
    'concluido',
    'cancelado',
  ],

  concluido: [],

  cancelado: [],
}

/* =========================================================
   HELPERS
   ========================================================= */

function statusValido(
  status: string,
): status is StatusPedido {
  return STATUS_VALIDOS.includes(
    status as StatusPedido,
  )
}

function transicaoPermitida(
  statusAtual: StatusPedido,
  novoStatus: StatusPedido,
): boolean {
  if (statusAtual === novoStatus) {
    return true
  }

  return TRANSICOES_STATUS[
    statusAtual
  ].includes(novoStatus)
}

/* =========================================================
   GET — LISTAR PEDIDOS
   ========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url)

    const limitParam = Number(
      searchParams.get('limit') ?? '100',
    )

    const limit = Math.min(
      Math.max(
        Number.isFinite(limitParam)
          ? limitParam
          : 100,
        1,
      ),
      200,
    )

    const result = await pool.query(
      `
        SELECT
          o.id,
          o.order_number,
          o.customer_id,
          o.customer_name,
          o.customer_whatsapp,
          o.delivery_type,
          o.cep,
          o.street,
          o.number,
          o.complement,
          o.neighborhood,
          o.city,
          o.reference_point,
          o.payment_method,
          o.change_for,
          o.subtotal,
          o.shipping,
          o.total,
          o.status,
          o.stock_restored,
          o.created_at,
          o.updated_at,

          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'subtotal', oi.subtotal
              )
              ORDER BY oi.id
            )
            FILTER (
              WHERE oi.id IS NOT NULL
            ),
            '[]'::json
          ) AS items

        FROM public.orders o

        LEFT JOIN public.order_items oi
          ON oi.order_id = o.id

        GROUP BY o.id

        ORDER BY o.created_at DESC

        LIMIT $1
      `,
      [limit],
    )

    const pedidos = result.rows.map(
      (pedido) => ({
        ...pedido,

        items: Array.isArray(
          pedido.items,
        )
          ? pedido.items
          : [],

        stock_restored:
          Boolean(
            pedido.stock_restored,
          ),
      }),
    )

    const totalPedidos =
      pedidos.length

    const valorTotal =
      pedidos.reduce(
        (
          total,
          pedido,
        ) => {
          if (
            pedido.status ===
            'cancelado'
          ) {
            return total
          }

          return (
            total +
            Number(
              pedido.total ?? 0,
            )
          )
        },
        0,
      )

    return NextResponse.json({
      sucesso: true,
      totalPedidos,
      valorTotal,
      pedidos,
    })
  } catch (error) {
    console.error(
      '[GET /api/admin/pedidos]',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          'Erro ao carregar os pedidos.',
      },
      {
        status: 500,
      },
    )
  }
}

/* =========================================================
   PATCH — ALTERAR STATUS DO PEDIDO

   IMPORTANTE:
   CANCELAR NÃO DEVOLVE ESTOQUE.

   A devolução é feita separadamente pelo endpoint:

   POST /api/admin/pedidos/estoque
   ========================================================= */

export async function PATCH(
  request: Request,
) {
  const client =
    await pool.connect()

  try {
    const body =
      await request.json()

    const pedidoId =
      body?.pedidoId

    const novoStatus =
      body?.status

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

    if (
      typeof novoStatus !==
        'string' ||
      !statusValido(
        novoStatus,
      )
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Status do pedido inválido.',
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

    const statusAtual =
      pedido.status as StatusPedido

    /* =====================================================
       VALIDAR STATUS ATUAL
       ===================================================== */

    if (
      !statusValido(
        statusAtual,
      )
    ) {
      await client.query(
        'ROLLBACK',
      )

      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'O pedido possui um status inválido no banco.',
        },
        {
          status: 409,
        },
      )
    }

    /* =====================================================
       VALIDAR TRANSIÇÃO
       ===================================================== */

    if (
      !transicaoPermitida(
        statusAtual,
        novoStatus,
      )
    ) {
      await client.query(
        'ROLLBACK',
      )

      return NextResponse.json(
        {
          sucesso: false,

          mensagem: `Não é permitido alterar o pedido de "${statusAtual}" para "${novoStatus}".`,

          statusAtual,

          novoStatus,

          transicoesPermitidas:
            TRANSICOES_STATUS[
              statusAtual
            ],
        },
        {
          status: 409,
        },
      )
    }

    /* =====================================================
       NENHUMA ALTERAÇÃO
       ===================================================== */

    if (
      statusAtual ===
      novoStatus
    ) {
      await client.query(
        'ROLLBACK',
      )

      return NextResponse.json({
        sucesso: true,

        mensagem:
          'O pedido já está nesse status.',

        pedidoId,

        status:
          statusAtual,

        estoqueDevolvido:
          false,
      })
    }

    /* =====================================================
       ATUALIZAR STATUS

       NÃO ALTERAMOS O ESTOQUE AQUI.
       ===================================================== */

    const updateResult =
      await client.query(
        `
          UPDATE public.orders
          SET
            status = $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            order_number,
            status,
            stock_restored,
            updated_at
        `,
        [
          novoStatus,
          pedidoId,
        ],
      )

    if (
      updateResult.rowCount ===
      0
    ) {
      throw new Error(
        'Não foi possível atualizar o pedido.',
      )
    }

    const pedidoAtualizado =
      updateResult.rows[0]

    /* =====================================================
       COMMIT
       ===================================================== */

    await client.query(
      'COMMIT',
    )

    return NextResponse.json({
      sucesso: true,

      mensagem:
        novoStatus ===
        'cancelado'
          ? 'Pedido cancelado. O estoque permanece inalterado até uma devolução manual.'
          : 'Status do pedido atualizado com sucesso.',

      pedido:
        pedidoAtualizado,

      estoqueDevolvido:
        false,
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
        '[PATCH /api/admin/pedidos] Erro no rollback:',
        rollbackError,
      )
    }

    console.error(
      '[PATCH /api/admin/pedidos]',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,

        mensagem:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar o pedido.',
      },
      {
        status: 500,
      },
    )
  } finally {
    client.release()
  }
}