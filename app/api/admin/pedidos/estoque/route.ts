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
   TIPOS
   ========================================================= */

type AcaoEstoque =
  | 'devolver'
  | 'nao_devolver'

type ResolucaoEstoque =
  | 'pendente'
  | 'devolvido'
  | 'nao_devolver'

/* =========================================================
   POST
   RESOLVER ESTOQUE DE PEDIDO CANCELADO

   devolver
   → devolve os produtos ao estoque

   nao_devolver
   → registra que os produtos não devem voltar

   REGRAS:

   1. Pedido precisa estar cancelado.
   2. Pedido é bloqueado durante a operação.
   3. Uma resolução não pode ser repetida.
   4. A devolução de todos os produtos acontece
      dentro da mesma transação.
   5. Se qualquer produto falhar, nada é alterado.
   ========================================================= */

export async function POST(request: Request) {
  const client = await pool.connect()

  try {
    /* =======================================================
       LER BODY
       ======================================================= */

    let body: {
      pedidoId?: unknown
      acao?: unknown
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'Dados inválidos enviados para resolver o estoque.',
        },
        { status: 400 },
      )
    }

    const pedidoId =
      typeof body?.pedidoId === 'string'
        ? body.pedidoId.trim()
        : ''

    const acao = body?.acao

    /* =======================================================
       VALIDAR ID
       ======================================================= */

    if (!pedidoId) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'ID do pedido não informado.',
        },
        { status: 400 },
      )
    }

    /* =======================================================
       VALIDAR AÇÃO
       ======================================================= */

    if (
      acao !== 'devolver' &&
      acao !== 'nao_devolver'
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Informe o que deve acontecer com os produtos do pedido.',
        },
        { status: 400 },
      )
    }

    /* =======================================================
       INICIAR TRANSAÇÃO
       ======================================================= */

    await client.query('BEGIN')

    /* =======================================================
       BUSCAR PEDIDO

       FOR UPDATE impede duas ações simultâneas no mesmo pedido.
       ======================================================= */

    const pedidoResult = await client.query(
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

    if (pedidoResult.rowCount === 0) {
      await client.query('ROLLBACK')

      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'Pedido não encontrado.',
        },
        { status: 404 },
      )
    }

    const pedido = pedidoResult.rows[0]

    /* =======================================================
       VALIDAR STATUS
       ======================================================= */

    if (pedido.status !== 'cancelado') {
      await client.query('ROLLBACK')

      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Essa ação só pode ser feita em pedidos cancelados.',
        },
        { status: 409 },
      )
    }

    /* =======================================================
       DETERMINAR SITUAÇÃO DO ESTOQUE

       Compatibilidade com pedidos antigos:

       stock_resolution = NULL
       +
       stock_restored = false

       → pendente

       stock_restored = true
       → devolvido
       ======================================================= */

    const resolucaoAtual: ResolucaoEstoque =
      pedido.stock_resolution === 'devolvido'
        ? 'devolvido'
        : pedido.stock_resolution === 'nao_devolver'
          ? 'nao_devolver'
          : pedido.stock_restored === true
            ? 'devolvido'
            : 'pendente'

    /* =======================================================
       IMPEDIR SEGUNDA RESOLUÇÃO
       ======================================================= */

    if (resolucaoAtual !== 'pendente') {
      await client.query('ROLLBACK')

      if (resolucaoAtual === 'devolvido') {
        return NextResponse.json(
          {
            sucesso: false,
            mensagem:
              'Os produtos deste pedido já foram devolvidos ao estoque.',
            resolucaoEstoque: 'devolvido',
            estoqueDevolvido: true,
          },
          { status: 409 },
        )
      }

      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            'Este pedido já foi marcado como não devolvido ao estoque.',
          resolucaoEstoque: 'nao_devolver',
          estoqueDevolvido: false,
        },
        { status: 409 },
      )
    }

    /* =======================================================
       AÇÃO:
       NÃO DEVOLVER
       ======================================================= */

    if (acao === 'nao_devolver') {
      const updateResult = await client.query(
        `
          UPDATE public.orders
          SET
            stock_resolution = 'nao_devolver',
            stock_restored = FALSE,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            order_number,
            status,
            stock_restored,
            stock_resolution,
            updated_at
        `,
        [pedidoId],
      )

      if (updateResult.rowCount === 0) {
        throw new Error(
          'Não foi possível registrar a decisão sobre o estoque.',
        )
      }

      await client.query('COMMIT')

      return NextResponse.json({
        sucesso: true,
        mensagem:
          'Decisão registrada. Os produtos deste pedido não serão devolvidos ao estoque.',
        pedido: updateResult.rows[0],
        resolucaoEstoque: 'nao_devolver',
        estoqueDevolvido: false,
        itens: [],
      })
    }

    /* =======================================================
       AÇÃO:
       DEVOLVER AO ESTOQUE

       Primeiro buscamos TODOS os itens.

       Nada é alterado no estoque antes de sabermos
       que todos os itens podem ser processados.
       ======================================================= */

    const itensResult = await client.query(
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

    if (itensResult.rowCount === 0) {
      throw new Error(
        'O pedido não possui produtos para devolver ao estoque.',
      )
    }

    /* =======================================================
       LISTA DE PRODUTOS DEVOLVIDOS
       ======================================================= */

    const itensDevolvidos: Array<{
      productId: string
      productName: string
      quantity: number
      stockAtual: number
    }> = []

    /* =======================================================
       PROCESSAR PRODUTOS

       Importante:

       Cada UPDATE ocorre dentro da transação.

       Se um produto não existir, o catch faz ROLLBACK
       e nenhum dos produtos anteriores permanece alterado.
       ======================================================= */

    for (const item of itensResult.rows) {
      const quantidade = Number(item.quantity)

      /* =====================================================
         VALIDAR QUANTIDADE
         ===================================================== */

      if (
        !Number.isInteger(quantidade) ||
        quantidade <= 0
      ) {
        throw new Error(
          `Quantidade inválida no produto "${item.product_name}".`,
        )
      }

      /* =====================================================
         VALIDAR PRODUTO
         ===================================================== */

      if (!item.product_id) {
        throw new Error(
          `O produto "${item.product_name}" não está vinculado a um produto do estoque.`,
        )
      }

      /* =====================================================
         DEVOLVER PRODUTO

         O UPDATE acontece dentro da transação.
         ===================================================== */

      const produtoResult = await client.query(
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

      /* =====================================================
         PRODUTO NÃO EXISTE
         ===================================================== */

      if (produtoResult.rowCount === 0) {
        throw new Error(
          `Produto "${item.product_name}" não foi encontrado no estoque.`,
        )
      }

      const produto = produtoResult.rows[0]

      itensDevolvidos.push({
        productId: String(produto.id),
        productName: String(produto.name),
        quantity: quantidade,
        stockAtual: Number(produto.stock),
      })
    }

    /* =======================================================
       MARCAR PEDIDO COMO RESOLVIDO
       ======================================================= */

    const updateResult = await client.query(
      `
        UPDATE public.orders
        SET
          stock_restored = TRUE,
          stock_resolution = 'devolvido',
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          order_number,
          status,
          stock_restored,
          stock_resolution,
          updated_at
      `,
      [pedidoId],
    )

    if (updateResult.rowCount === 0) {
      throw new Error(
        'Não foi possível registrar a devolução do estoque.',
      )
    }

    /* =======================================================
       FINALIZAR TRANSAÇÃO
       ======================================================= */

    await client.query('COMMIT')

    /* =======================================================
       RESPOSTA
       ======================================================= */

    return NextResponse.json({
      sucesso: true,

      mensagem:
        'Produtos devolvidos ao estoque com sucesso.',

      pedido: updateResult.rows[0],

      resolucaoEstoque: 'devolvido',

      estoqueDevolvido: true,

      itens: itensDevolvidos,
    })
  } catch (error) {
    /* =======================================================
       ROLLBACK
       ======================================================= */

    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
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
            : 'Erro ao resolver o estoque do pedido.',
      },
      { status: 500 },
    )
  } finally {
    client.release()
  }
}