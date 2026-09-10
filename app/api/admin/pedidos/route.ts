import { NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

export const runtime = 'nodejs'

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
   RESOLUÇÃO DO ESTOQUE
   ========================================================= */

const RESOLUCOES_ESTOQUE = [
  'pendente',
  'devolvido',
  'nao_devolver',
] as const

type ResolucaoEstoque =
  (typeof RESOLUCOES_ESTOQUE)[number]

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
   NORMALIZAR RESOLUÇÃO DO ESTOQUE

   Compatibilidade com pedidos antigos:

   stock_resolution = NULL
   stock_restored = false
      → pendente

   stock_resolution = NULL
   stock_restored = true
      → devolvido

   stock_resolution = devolvido
      → devolvido

   stock_resolution = nao_devolver
      → nao_devolver
   ========================================================= */

function obterResolucaoEstoque(
  stockResolution: unknown,
  stockRestored: unknown,
): ResolucaoEstoque {
  if (
    stockResolution ===
    'devolvido'
  ) {
    return 'devolvido'
  }

  if (
    stockResolution ===
    'nao_devolver'
  ) {
    return 'nao_devolver'
  }

  if (
    stockRestored === true
  ) {
    return 'devolvido'
  }

  return 'pendente'
}

/* =========================================================
   GET — LISTAR PEDIDOS
   =========================================================

   IMPORTANTE:

   A lista normal continua limitada.

   Porém, os pedidos cancelados com estoque pendente
   são buscados separadamente.

   Dessa forma, uma pendência antiga NÃO desaparece
   porque chegaram novos pedidos.

   ========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url)

    /* =======================================================
       LIMITE DA LISTA NORMAL
       ======================================================= */

    const limitParam = Number(
      searchParams.get(
        'limit',
      ) ?? '100',
    )

    const limit = Math.min(
      Math.max(
        Number.isFinite(
          limitParam,
        )
          ? limitParam
          : 100,
        1,
      ),
      200,
    )

    /* =======================================================
       FILTRO

       Pode receber:

       todos
       recebido
       confirmado
       em_preparo
       saiu_para_entrega
       concluido
       cancelado
       pendencias
       ======================================================= */

    const filtro =
      searchParams.get(
        'filtro',
      ) ?? 'todos'

    /* =======================================================
       VALIDAÇÃO DO FILTRO
       ======================================================= */

    const filtroValido =
      filtro === 'todos' ||
      filtro === 'pendencias' ||
      statusValido(filtro)

    if (!filtroValido) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Filtro de pedidos inválido.',
        },
        {
          status: 400,
        },
      )
    }

    /* =======================================================
       PEDIDOS QUE PRECISAM DE ATENÇÃO

       ATENÇÃO:

       Não usamos LIMIT aqui.

       A finalidade é justamente impedir que uma
       pendência antiga desapareça.

       São pedidos:

       status = cancelado

       E:

       stock_resolution = pendente
       OU
       stock_resolution IS NULL + stock_restored = false

       ======================================================= */

    const pendenciasResult =
      await pool.query(
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
            o.stock_resolution,
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

          WHERE
            o.status = 'cancelado'

            AND (
              (
                o.stock_resolution IS NULL
                AND COALESCE(
                  o.stock_restored,
                  FALSE
                ) = FALSE
              )

              OR

              o.stock_resolution = 'pendente'
            )

          GROUP BY o.id

          ORDER BY
            o.created_at ASC
        `,
      )

    /* =======================================================
       NORMALIZAR PENDÊNCIAS
       ======================================================= */

    const pendencias =
      pendenciasResult.rows.map(
        (pedido) => ({
          ...pedido,

          items:
            Array.isArray(
              pedido.items,
            )
              ? pedido.items
              : [],

          stock_restored:
            Boolean(
              pedido.stock_restored,
            ),

          stock_resolution:
            obterResolucaoEstoque(
              pedido.stock_resolution,
              Boolean(
                pedido.stock_restored,
              ),
            ),

          precisa_atencao: true,
        }),
      )

    /* =======================================================
       SE FILTRO = PENDÊNCIAS

       Retornamos somente as pendências.

       Isso permite ao frontend criar um filtro
       específico sem depender da lista normal.
       ======================================================= */

    if (
      filtro ===
      'pendencias'
    ) {
      const valorTotalPendencias =
        pendencias.reduce(
          (
            total,
            pedido,
          ) =>
            total +
            Number(
              pedido.total ?? 0,
            ),
          0,
        )

      return NextResponse.json({
        sucesso: true,

        totalPedidos:
          pendencias.length,

        valorTotal:
          valorTotalPendencias,

        pendencias: {
          total:
            pendencias.length,

          pedidos:
            pendencias,
        },

        pedidos:
          pendencias,
      })
    }

    /* =======================================================
       BUSCAR LISTA NORMAL
       ======================================================= */

    const parametros: Array<
      string | number
    > = []

    let where = ''

    /* =======================================================
       FILTRAR POR STATUS
       ======================================================= */

    if (
      filtro !== 'todos'
    ) {
      parametros.push(
        filtro,
      )

      where = `
        WHERE o.status = $1
      `
    }

    /* =======================================================
       LIMIT

       O número do parâmetro depende da existência
       do filtro.
       ======================================================= */

    const parametroLimit =
      parametros.length + 1

    parametros.push(
      limit,
    )

    const result =
      await pool.query(
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
            o.stock_resolution,
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

          ${where}

          GROUP BY o.id

          ORDER BY
            o.created_at DESC

          LIMIT $${parametroLimit}
        `,
        parametros,
      )

    /* =======================================================
       NORMALIZAR PEDIDOS
       ======================================================= */

    const pedidos =
      result.rows.map(
        (pedido) => {
          const stockRestored =
            Boolean(
              pedido.stock_restored,
            )

          const stockResolution =
            obterResolucaoEstoque(
              pedido.stock_resolution,
              stockRestored,
            )

          const precisaAtencao =
            pedido.status ===
              'cancelado' &&
            stockResolution ===
              'pendente'

          return {
            ...pedido,

            items:
              Array.isArray(
                pedido.items,
              )
                ? pedido.items
                : [],

            stock_restored:
              stockRestored,

            stock_resolution:
              stockResolution,

            precisa_atencao:
              precisaAtencao,
          }
        },
      )

    /* =======================================================
       TOTAL DE PEDIDOS DA LISTA
       ======================================================= */

    const totalPedidos =
      pedidos.length

    /* =======================================================
       FATURAMENTO

       Cancelados não entram.
       ======================================================= */

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

    /* =======================================================
       RESPOSTA
       ======================================================= */

    return NextResponse.json({
      sucesso: true,

      totalPedidos,

      valorTotal,

      /* =====================================================
         RESUMO DE ATENÇÃO

         Esse número é independente do LIMIT.
         ===================================================== */

      pendencias: {
        total:
          pendencias.length,

        pedidos:
          pendencias,
      },

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

   A devolução é feita separadamente em:

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

    /* =======================================================
       VALIDAÇÃO DO ID
       ======================================================= */

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

    /* =======================================================
       VALIDAÇÃO DO STATUS
       ======================================================= */

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

    /* =======================================================
       TRANSAÇÃO
       ======================================================= */

    await client.query(
      'BEGIN',
    )

    /* =======================================================
       BUSCAR PEDIDO COM LOCK
       ======================================================= */

    const pedidoResult =
      await client.query(
        `
          SELECT
            id,
            order_number,
            status,
            stock_restored,
            stock_resolution
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

    /* =======================================================
       VALIDAR STATUS ATUAL
       ======================================================= */

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

    /* =======================================================
       VALIDAR TRANSIÇÃO
       ======================================================= */

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

          mensagem:
            `Não é permitido alterar o pedido de "${statusAtual}" para "${novoStatus}".`,

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

    /* =======================================================
       NENHUMA ALTERAÇÃO
       ======================================================= */

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
          Boolean(
            pedido.stock_restored,
          ),

        resolucaoEstoque:
          obterResolucaoEstoque(
            pedido.stock_resolution,
            Boolean(
              pedido.stock_restored,
            ),
          ),
      })
    }

    /* =======================================================
       ATUALIZAR STATUS

       IMPORTANTE:

       Se estiver cancelando agora,
       garantimos que a resolução do estoque
       fique como pendente.

       Não devolvemos estoque aqui.
       ======================================================= */

    const deveMarcarComoPendente =
      novoStatus ===
        'cancelado' &&
      statusAtual !==
        'cancelado'

    const updateResult =
      await client.query(
        `
          UPDATE public.orders
          SET
            status = $1,

            stock_resolution =
              CASE
                WHEN $1 = 'cancelado'
                 AND $2 = FALSE
                THEN 'pendente'

                ELSE stock_resolution
              END,

            updated_at = NOW()

          WHERE id = $3

          RETURNING
            id,
            order_number,
            status,
            stock_restored,
            stock_resolution,
            updated_at
        `,
        [
          novoStatus,
          deveMarcarComoPendente,
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

    /* =======================================================
       COMMIT
       ======================================================= */

    await client.query(
      'COMMIT',
    )

    /* =======================================================
       RESOLUÇÃO FINAL
       ======================================================= */

    const resolucaoEstoque =
      obterResolucaoEstoque(
        pedidoAtualizado.stock_resolution,
        Boolean(
          pedidoAtualizado.stock_restored,
        ),
      )

    /* =======================================================
       RESPOSTA
       ======================================================= */

    return NextResponse.json({
      sucesso: true,

      mensagem:
        novoStatus ===
        'cancelado'
          ? 'Pedido cancelado. Os produtos permanecem pendentes de decisão sobre o estoque.'
          : 'Status do pedido atualizado com sucesso.',

      pedido: {
        ...pedidoAtualizado,

        stock_restored:
          Boolean(
            pedidoAtualizado.stock_restored,
          ),

        stock_resolution:
          resolucaoEstoque,
      },

      estoqueDevolvido:
        Boolean(
          pedidoAtualizado.stock_restored,
        ),

      resolucaoEstoque,
    })
  } catch (error) {
    /* =======================================================
       ROLLBACK
       ======================================================= */

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