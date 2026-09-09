import { NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'
import { exigirAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

function normalizarWhatsapp(valor: unknown) {
  const numeros = String(valor ?? '').replace(/\D/g, '')

  if (!numeros) return ''

  if (numeros.startsWith('55')) {
    return numeros
  }

  if (numeros.length === 10 || numeros.length === 11) {
    return `55${numeros}`
  }

  return numeros
}

function textoSeguro(valor: unknown) {
  return String(valor ?? '').trim()
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function clienteFormatado(cliente: any) {
  return {
    id: String(cliente.id),

    name: textoSeguro(cliente.name),

    whatsapp: textoSeguro(cliente.whatsapp),

    cep: textoSeguro(cliente.cep),

    street: textoSeguro(cliente.street),

    number: textoSeguro(cliente.number),

    complement: textoSeguro(cliente.complement),

    neighborhood: textoSeguro(
      cliente.neighborhood,
    ),

    city: textoSeguro(cliente.city),

    reference_point: textoSeguro(
      cliente.reference_point,
    ),

    created_at: cliente.created_at,

    updated_at: cliente.updated_at,

    /*
      HISTÓRICO COMPLETO
      Inclui pedidos cancelados.
    */
    total_orders: numeroSeguro(
      cliente.total_orders,
    ),

    /*
      PEDIDOS VÁLIDOS
      Não inclui cancelados.
    */
    completed_orders: numeroSeguro(
      cliente.completed_orders,
    ),

    /*
      VALOR GASTO
      Não inclui pedidos cancelados.
    */
    total_spent: numeroSeguro(
      cliente.total_spent,
    ),

    /*
      ÚLTIMO PEDIDO VÁLIDO
      Não considera cancelados.
    */
    last_order_at:
      cliente.last_order_at ?? null,
  }
}

/* =========================================================
   GET
   Lista clientes + resumo de pedidos
   ========================================================= */

export async function GET(
  request: Request,
) {
  try {
    await exigirAdmin()

    const { searchParams } =
      new URL(request.url)

    const busca = textoSeguro(
      searchParams.get('busca'),
    )

    const status = textoSeguro(
      searchParams.get('status'),
    )

    const valores: string[] = []

    const filtros: string[] = []

    /* =====================================================
       BUSCA
       Nome ou WhatsApp
       ===================================================== */

    if (busca) {
      valores.push(`%${busca}%`)

      const parametro =
        `$${valores.length}`

      filtros.push(`
        (
          c.name ILIKE ${parametro}

          OR c.whatsapp ILIKE ${parametro}

          OR regexp_replace(
            c.whatsapp,
            '\\D',
            '',
            'g'
          ) ILIKE regexp_replace(
            ${parametro},
            '\\D',
            '',
            'g'
          )
        )
      `)
    }

    /* =====================================================
       FILTRO — CLIENTES COM PEDIDOS
       ===================================================== */

    if (status === 'ativos') {
      filtros.push(`
        COALESCE(
          resumo.total_orders,
          0
        ) > 0
      `)
    }

    /* =====================================================
       FILTRO — CLIENTES SEM PEDIDOS
       ===================================================== */

    if (status === 'sem_pedidos') {
      filtros.push(`
        COALESCE(
          resumo.total_orders,
          0
        ) = 0
      `)
    }

    const where =
      filtros.length > 0
        ? `WHERE ${filtros.join(' AND ')}`
        : ''

    /* =====================================================
       CLIENTES

       IMPORTANTE:

       total_orders:
         Todos os pedidos do cliente.

       completed_orders:
         Todos os pedidos, exceto cancelados.

       total_spent:
         Soma apenas dos pedidos não cancelados.

       last_order_at:
         Último pedido não cancelado.
       ===================================================== */

    const resultado =
      await pool.query(
        `
          SELECT
            c.id,
            c.name,
            c.whatsapp,
            c.cep,
            c.street,
            c.number,
            c.complement,
            c.neighborhood,
            c.city,
            c.reference_point,
            c.created_at,
            c.updated_at,

            COALESCE(
              resumo.total_orders,
              0
            ) AS total_orders,

            COALESCE(
              resumo.completed_orders,
              0
            ) AS completed_orders,

            COALESCE(
              resumo.total_spent,
              0
            ) AS total_spent,

            resumo.last_order_at

          FROM public.customers c

          LEFT JOIN (
            SELECT
              customer_id,

              /*
                HISTÓRICO COMPLETO
              */
              COUNT(*)::int
                AS total_orders,

              /*
                PEDIDOS QUE NÃO FORAM CANCELADOS
              */
              COUNT(*) FILTER (
                WHERE status <> 'cancelado'
              )::int
                AS completed_orders,

              /*
                DINHEIRO REALMENTE VENDIDO
                EXCLUINDO CANCELADOS
              */
              COALESCE(
                SUM(total) FILTER (
                  WHERE status <> 'cancelado'
                ),
                0
              ) AS total_spent,

              /*
                ÚLTIMO PEDIDO VÁLIDO
                EXCLUINDO CANCELADOS
              */
              MAX(created_at) FILTER (
                WHERE status <> 'cancelado'
              ) AS last_order_at

            FROM public.orders

            WHERE customer_id IS NOT NULL

            GROUP BY customer_id

          ) resumo

            ON resumo.customer_id = c.id

          ${where}

          ORDER BY
            COALESCE(
              resumo.last_order_at,
              c.created_at
            ) DESC,

            c.name ASC
        `,
        valores,
      )

    const clientes =
      resultado.rows.map(
        clienteFormatado,
      )

    /* =====================================================
       MÉTRICAS GERAIS DE CLIENTES
       ===================================================== */

    const metricasResult =
      await pool.query(
        `
          SELECT

            COUNT(*)::int
              AS total_clientes,

            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1
                FROM public.orders o
                WHERE o.customer_id = c.id
              )
            )::int
              AS clientes_com_pedidos,

            COUNT(*) FILTER (
              WHERE NOT EXISTS (
                SELECT 1
                FROM public.orders o
                WHERE o.customer_id = c.id
              )
            )::int
              AS clientes_sem_pedidos,

            COUNT(*) FILTER (
              WHERE c.created_at >=
                date_trunc(
                  'month',
                  CURRENT_DATE
                )
            )::int
              AS novos_mes

          FROM public.customers c
        `,
      )

    /* =====================================================
       MÉTRICAS DE VENDAS
       
       IMPORTANTE:
       CANCELADOS NÃO ENTRAM.
       ===================================================== */

    const vendasResult =
      await pool.query(
        `
          SELECT

            COALESCE(
              SUM(total) FILTER (
                WHERE status <> 'cancelado'
              ),
              0
            ) AS total_vendido,

            COUNT(*) FILTER (
              WHERE status <> 'cancelado'
            )::int AS total_pedidos

          FROM public.orders

          WHERE customer_id IS NOT NULL
        `,
      )

    const metricas =
      metricasResult.rows[0] ?? {}

    const vendas =
      vendasResult.rows[0] ?? {}

    /* =====================================================
       RESPOSTA
       ===================================================== */

    return NextResponse.json({
      sucesso: true,

      clientes,

      metricas: {
        total_clientes:
          numeroSeguro(
            metricas.total_clientes,
          ),

        clientes_com_pedidos:
          numeroSeguro(
            metricas.clientes_com_pedidos,
          ),

        clientes_sem_pedidos:
          numeroSeguro(
            metricas.clientes_sem_pedidos,
          ),

        novos_mes:
          numeroSeguro(
            metricas.novos_mes,
          ),

        total_vendido:
          numeroSeguro(
            vendas.total_vendido,
          ),

        total_pedidos:
          numeroSeguro(
            vendas.total_pedidos,
          ),
      },
    })
  } catch (error) {
    console.error(
      'Erro ao listar clientes:',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          'Não foi possível carregar os clientes.',
      },
      {
        status: 500,
      },
    )
  }
}

/* =========================================================
   POST
   Cria cliente
   ========================================================= */

export async function POST(
  request: Request,
) {
  try {
    await exigirAdmin()

    const body =
      await request.json()

    const name =
      textoSeguro(body?.name)

    const whatsapp =
      normalizarWhatsapp(
        body?.whatsapp,
      )

    if (!name) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Nome do cliente é obrigatório.',
        },
        {
          status: 400,
        },
      )
    }

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'WhatsApp inválido.',
        },
        {
          status: 400,
        },
      )
    }

    const existente =
      await pool.query(
        `
          SELECT id
          FROM public.customers
          WHERE whatsapp = $1
          LIMIT 1
        `,
        [whatsapp],
      )

    if (
      existente.rows.length > 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Já existe um cliente com este WhatsApp.',
        },
        {
          status: 409,
        },
      )
    }

    const resultado =
      await pool.query(
        `
          INSERT INTO public.customers (
            name,
            whatsapp,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference_point
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
          )

          RETURNING
            id,
            name,
            whatsapp,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference_point,
            created_at,
            updated_at
        `,
        [
          name,
          whatsapp,

          textoSeguro(
            body?.cep,
          ) || null,

          textoSeguro(
            body?.street,
          ) || null,

          textoSeguro(
            body?.number,
          ) || null,

          textoSeguro(
            body?.complement,
          ) || null,

          textoSeguro(
            body?.neighborhood,
          ) || null,

          textoSeguro(
            body?.city,
          ) || null,

          textoSeguro(
            body?.reference_point,
          ) || null,
        ],
      )

    return NextResponse.json(
      {
        sucesso: true,

        cliente:
          clienteFormatado(
            resultado.rows[0],
          ),
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      'Erro ao criar cliente:',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          'Não foi possível criar o cliente.',
      },
      {
        status: 500,
      },
    )
  }
}

/* =========================================================
   PATCH
   Atualiza cliente
   ========================================================= */

export async function PATCH(
  request: Request,
) {
  try {
    await exigirAdmin()

    const body =
      await request.json()

    const id =
      textoSeguro(body?.id)

    const name =
      textoSeguro(body?.name)

    const whatsapp =
      normalizarWhatsapp(
        body?.whatsapp,
      )

    if (!id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Cliente inválido.',
        },
        {
          status: 400,
        },
      )
    }

    if (!name) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Nome do cliente é obrigatório.',
        },
        {
          status: 400,
        },
      )
    }

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'WhatsApp inválido.',
        },
        {
          status: 400,
        },
      )
    }

    const existente =
      await pool.query(
        `
          SELECT id
          FROM public.customers
          WHERE whatsapp = $1
            AND id <> $2
          LIMIT 1
        `,
        [
          whatsapp,
          id,
        ],
      )

    if (
      existente.rows.length > 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Este WhatsApp já pertence a outro cliente.',
        },
        {
          status: 409,
        },
      )
    }

    const resultado =
      await pool.query(
        `
          UPDATE public.customers

          SET
            name = $1,
            whatsapp = $2,
            cep = $3,
            street = $4,
            number = $5,
            complement = $6,
            neighborhood = $7,
            city = $8,
            reference_point = $9,
            updated_at = NOW()

          WHERE id = $10

          RETURNING
            id,
            name,
            whatsapp,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference_point,
            created_at,
            updated_at
        `,
        [
          name,
          whatsapp,

          textoSeguro(
            body?.cep,
          ) || null,

          textoSeguro(
            body?.street,
          ) || null,

          textoSeguro(
            body?.number,
          ) || null,

          textoSeguro(
            body?.complement,
          ) || null,

          textoSeguro(
            body?.neighborhood,
          ) || null,

          textoSeguro(
            body?.city,
          ) || null,

          textoSeguro(
            body?.reference_point,
          ) || null,

          id,
        ],
      )

    if (
      resultado.rows.length === 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Cliente não encontrado.',
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      sucesso: true,

      cliente:
        clienteFormatado(
          resultado.rows[0],
        ),
    })
  } catch (error) {
    console.error(
      'Erro ao atualizar cliente:',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          'Não foi possível atualizar o cliente.',
      },
      {
        status: 500,
      },
    )
  }
}

/* =========================================================
   DELETE
   Não apagamos cliente que possui pedidos.
   ========================================================= */

export async function DELETE(
  request: Request,
) {
  try {
    await exigirAdmin()

    const { searchParams } =
      new URL(request.url)

    const id =
      textoSeguro(
        searchParams.get('id'),
      )

    if (!id) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Cliente inválido.',
        },
        {
          status: 400,
        },
      )
    }

    const pedidos =
      await pool.query(
        `
          SELECT
            COUNT(*)::int AS total

          FROM public.orders

          WHERE customer_id = $1
        `,
        [id],
      )

    const totalPedidos =
      numeroSeguro(
        pedidos.rows[0]?.total,
      )

    if (totalPedidos > 0) {
      return NextResponse.json(
        {
          sucesso: false,

          erro:
            'Este cliente possui pedidos e não pode ser excluído.',

          total_pedidos:
            totalPedidos,
        },
        {
          status: 409,
        },
      )
    }

    const resultado =
      await pool.query(
        `
          DELETE FROM public.customers

          WHERE id = $1

          RETURNING id
        `,
        [id],
      )

    if (
      resultado.rows.length === 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Cliente não encontrado.',
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      sucesso: true,

      mensagem:
        'Cliente excluído com sucesso.',
    })
  } catch (error) {
    console.error(
      'Erro ao excluir cliente:',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          'Não foi possível excluir o cliente.',
      },
      {
        status: 500,
      },
    )
  }
}