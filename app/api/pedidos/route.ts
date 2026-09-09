
import { NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

export const runtime = 'nodejs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// =========================================================
// TIPOS
// =========================================================

type ItemPedido = {
  id: string
  quantidade: number
}

type BodyPedido = {
  cliente?: {
    nome?: string
    whatsapp?: string
    cep?: string
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
    referencia?: string
  }

  formaEntrega?: 'entrega' | 'retirada'

  formaPagamento?: 'pix' | 'dinheiro' | 'cartao'

  trocoPara?: number | null

  frete?: number | null

  itens?: ItemPedido[]
}

// =========================================================
// UTILITÁRIOS
// =========================================================

function somenteNumeros(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '')
}

function normalizarWhatsApp(
  valor: unknown,
): string {
  const numeros =
    somenteNumeros(valor)

  if (
    numeros.startsWith('55')
  ) {
    return numeros
  }

  if (
    numeros.length === 10 ||
    numeros.length === 11
  ) {
    return `55${numeros}`
  }

  return numeros
}

function numeroSeguro(
  valor: unknown,
): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 0
  }

  const numero =
    Number(valor)

  return Number.isFinite(
    numero,
  )
    ? numero
    : 0
}

function formatarNumeroPedido(
  numero: number,
): string {
  return `#${String(
    numero,
  ).padStart(5, '0')}`
}

// =========================================================
// POST — CRIAR PEDIDO
// =========================================================

export async function POST(
  request: Request,
) {
  const client =
    await pool.connect()

  let transacaoIniciada =
    false

  try {
    // =====================================================
    // LÊ BODY
    // =====================================================

    const body =
      (await request.json()) as BodyPedido

    const cliente =
      body.cliente

    if (!cliente) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Dados do cliente não informados.',
        },
        { status: 400 },
      )
    }

    // =====================================================
    // DADOS DO CLIENTE
    // =====================================================

    const nome =
      String(
        cliente.nome ?? '',
      ).trim()

    const whatsapp =
      normalizarWhatsApp(
        cliente.whatsapp,
      )

    const cep =
      somenteNumeros(
        cliente.cep,
      )

    const rua =
      String(
        cliente.rua ?? '',
      ).trim()

    const numero =
      String(
        cliente.numero ?? '',
      ).trim()

    const complemento =
      String(
        cliente.complemento ?? '',
      ).trim()

    const bairro =
      String(
        cliente.bairro ?? '',
      ).trim()

    const cidade =
      String(
        cliente.cidade ?? '',
      ).trim()

    const referencia =
      String(
        cliente.referencia ?? '',
      ).trim()

    const formaEntrega =
      body.formaEntrega

    const formaPagamento =
      body.formaPagamento

    const itens =
      Array.isArray(
        body.itens,
      )
        ? body.itens
        : []

    // =====================================================
    // VALIDAÇÕES
    // =====================================================

    if (!nome) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Informe o nome.',
        },
        { status: 400 },
      )
    }

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'WhatsApp inválido.',
        },
        { status: 400 },
      )
    }

    if (
      formaEntrega !==
        'entrega' &&
      formaEntrega !==
        'retirada'
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Forma de entrega inválida.',
        },
        { status: 400 },
      )
    }

    if (
      formaPagamento !==
        'pix' &&
      formaPagamento !==
        'dinheiro' &&
      formaPagamento !==
        'cartao'
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Forma de pagamento inválida.',
        },
        { status: 400 },
      )
    }

    if (
      itens.length === 0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'O pedido não possui produtos.',
        },
        { status: 400 },
      )
    }

    // =====================================================
    // VALIDA ENDEREÇO
    // =====================================================

    if (
      formaEntrega ===
      'entrega'
    ) {
      if (!cep) {
        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'CEP não informado.',
          },
          { status: 400 },
        )
      }

      if (!rua) {
        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'Rua não informada.',
          },
          { status: 400 },
        )
      }

      if (!numero) {
        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'Número não informado.',
          },
          { status: 400 },
        )
      }

      if (!bairro) {
        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'Bairro não informado.',
          },
          { status: 400 },
        )
      }

      if (!cidade) {
        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'Cidade não informada.',
          },
          { status: 400 },
        )
      }
    }

    // =====================================================
    // INICIA TRANSAÇÃO
    // =====================================================

    await client.query(
      'BEGIN',
    )

    transacaoIniciada =
      true

    // =====================================================
    // BUSCA PRODUTOS
    //
    // O PREÇO VEM DIRETAMENTE DO BANCO.
    // =====================================================

    const ids =
      itens.map(
        (item) =>
          item.id,
      )

    const produtosResult =
      await client.query(
        `
          SELECT
            id,
            name,
            price,
            stock,
            active
          FROM public.products
          WHERE id = ANY($1::uuid[])
        `,
        [ids],
      )

    const produtosMap =
      new Map<
        string,
        {
          id: string
          name: string
          price: number
          stock: number
          active: boolean
        }
      >()

    for (
      const produto
      of produtosResult.rows
    ) {
      produtosMap.set(
        String(
          produto.id,
        ),
        {
          id: String(
            produto.id,
          ),

          name: String(
            produto.name,
          ),

          price:
            Number(
              produto.price,
            ),

          stock:
            Number(
              produto.stock,
            ),

          active:
            Boolean(
              produto.active,
            ),
        },
      )
    }

    // =====================================================
    // CONFERE SE TODOS OS PRODUTOS EXISTEM
    // =====================================================

    if (
      produtosMap.size !==
      itens.length
    ) {
      await client.query(
        'ROLLBACK',
      )

      transacaoIniciada =
        false

      return NextResponse.json(
        {
          sucesso: false,
          erro:
            'Um ou mais produtos não foram encontrados.',
        },
        { status: 400 },
      )
    }

    // =====================================================
    // PROCESSA ITENS
    // =====================================================

    let subtotal = 0

    const itensProcessados: {
      id: string
      name: string
      quantidade: number
      precoUnitario: number
      subtotal: number
    }[] = []

    for (
      const item of itens
    ) {
      const produto =
        produtosMap.get(
          item.id,
        )

      if (!produto) {
        await client.query(
          'ROLLBACK',
        )

        transacaoIniciada =
          false

        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'Produto não encontrado.',
          },
          { status: 400 },
        )
      }

      const quantidade =
        Math.floor(
          Number(
            item.quantidade,
          ),
        )

      if (
        !Number.isFinite(
          quantidade,
        ) ||
        quantidade < 1
      ) {
        await client.query(
          'ROLLBACK',
        )

        transacaoIniciada =
          false

        return NextResponse.json(
          {
            sucesso: false,
            erro:
              `Quantidade inválida para ${produto.name}.`,
          },
          { status: 400 },
        )
      }

      if (
        !produto.active
      ) {
        await client.query(
          'ROLLBACK',
        )

        transacaoIniciada =
          false

        return NextResponse.json(
          {
            sucesso: false,
            erro:
              `${produto.name} não está disponível.`,
          },
          { status: 400 },
        )
      }

      if (
        produto.stock <
        quantidade
      ) {
        await client.query(
          'ROLLBACK',
        )

        transacaoIniciada =
          false

        return NextResponse.json(
          {
            sucesso: false,
            erro:
              `Estoque insuficiente para ${produto.name}.`,
          },
          { status: 400 },
        )
      }

      const subtotalItem =
        produto.price *
        quantidade

      subtotal +=
        subtotalItem

      itensProcessados.push(
        {
          id:
            produto.id,

          name:
            produto.name,

          quantidade,

          precoUnitario:
            produto.price,

          subtotal:
            subtotalItem,
        },
      )
    }

    // =====================================================
    // FRETE
    // =====================================================

    const freteInformado =
      body.frete !==
        null &&
      body.frete !==
        undefined &&
      body.frete !==
        ''

    let frete = 0

    let freteACombinar =
      false

    if (
      formaEntrega ===
      'retirada'
    ) {
      frete = 0

      freteACombinar =
        false
    } else if (
      freteInformado
    ) {
      frete =
        numeroSeguro(
          body.frete,
        )

      if (frete < 0) {
        await client.query(
          'ROLLBACK',
        )

        transacaoIniciada =
          false

        return NextResponse.json(
          {
            sucesso: false,
            erro:
              'Valor de frete inválido.',
          },
          { status: 400 },
        )
      }

      freteACombinar =
        false
    } else {
      frete = 0

      freteACombinar =
        true
    }

    const total =
      subtotal + frete

    // =====================================================
    // TROCO
    // =====================================================

    let trocoPara:
      | number
      | null = null

    if (
      formaPagamento ===
      'dinheiro'
    ) {
      if (
        body.trocoPara !==
          null &&
        body.trocoPara !==
          undefined &&
        body.trocoPara !==
          ''
      ) {
        trocoPara =
          numeroSeguro(
            body.trocoPara,
          )

        if (
          trocoPara <
          total
        ) {
          await client.query(
            'ROLLBACK',
          )

          transacaoIniciada =
            false

          return NextResponse.json(
            {
              sucesso: false,
              erro:
                'O valor para troco precisa ser maior ou igual ao total do pedido.',
            },
            { status: 400 },
          )
        }
      }
    }

    // =====================================================
    // BUSCA CLIENTE PELO WHATSAPP
    // =====================================================

    const clienteExistente =
      await client.query(
        `
          SELECT
            id
          FROM public.customers
          WHERE whatsapp = $1
          LIMIT 1
        `,
        [whatsapp],
      )

    let customerId: string

    // =====================================================
    // ATUALIZA CLIENTE EXISTENTE
    // =====================================================

    if (
      clienteExistente
        .rows.length > 0
    ) {
      customerId =
        String(
          clienteExistente
            .rows[0]
            .id,
        )

      await client.query(
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
        `,
        [
          nome,
          whatsapp,
          cep || null,
          rua || null,
          numero || null,
          complemento ||
            null,
          bairro || null,
          cidade || null,
          referencia ||
            null,
          customerId,
        ],
      )
    }

    // =====================================================
    // CRIA NOVO CLIENTE
    // =====================================================

    else {
      const novoCliente =
        await client.query(
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
              reference_point,
              created_at,
              updated_at
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
              $9,
              NOW(),
              NOW()
            )
            RETURNING id
          `,
          [
            nome,
            whatsapp,
            cep || null,
            rua || null,
            numero || null,
            complemento ||
              null,
            bairro || null,
            cidade || null,
            referencia ||
              null,
          ],
        )

      customerId =
        String(
          novoCliente
            .rows[0]
            .id,
        )
    }

    // =====================================================
    // CRIA PEDIDO
    //
    // order_number NÃO É ENVIADO.
    // O BANCO GERA AUTOMATICAMENTE.
    // =====================================================

    const pedidoResult =
      await client.query(
        `
          INSERT INTO public.orders (
            customer_id,
            customer_name,
            customer_whatsapp,
            delivery_type,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference_point,
            payment_method,
            change_for,
            subtotal,
            shipping,
            total,
            status,
            created_at,
            updated_at
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
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            'recebido',
            NOW(),
            NOW()
          )
          RETURNING
            id,
            order_number,
            customer_id,
            customer_name,
            customer_whatsapp,
            delivery_type,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference_point,
            payment_method,
            change_for,
            subtotal,
            shipping,
            total,
            status,
            created_at,
            updated_at
        `,
        [
          customerId,
          nome,
          whatsapp,
          formaEntrega,

          formaEntrega ===
          'entrega'
            ? cep || null
            : null,

          formaEntrega ===
          'entrega'
            ? rua || null
            : null,

          formaEntrega ===
          'entrega'
            ? numero || null
            : null,

          formaEntrega ===
          'entrega'
            ? complemento ||
              null
            : null,

          formaEntrega ===
          'entrega'
            ? bairro || null
            : null,

          formaEntrega ===
          'entrega'
            ? cidade || null
            : null,

          formaEntrega ===
          'entrega'
            ? referencia ||
              null
            : null,

          formaPagamento,

          trocoPara,

          subtotal,

          frete,

          total,
        ],
      )

    const pedido =
      pedidoResult.rows[0]

    if (!pedido) {
      throw new Error(
        'O pedido não foi retornado pelo banco de dados.',
      )
    }

    // =====================================================
    // SALVA OS ITENS DO PEDIDO
    //
    // IMPORTANTE:
    // order_items NÃO possui "total".
    // A coluna obrigatória é "subtotal".
    //
    // subtotal = quantidade × unit_price
    // =====================================================

    for (
      const item of
      itensProcessados
    ) {
      await client.query(
        `
          INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
        `,
        [
          pedido.id,
          item.id,
          item.name,
          item.quantidade,
          item.precoUnitario,
          item.subtotal,
        ],
      )
    }

    // =====================================================
    // BAIXA ESTOQUE
    // =====================================================

    for (
      const item of
      itensProcessados
    ) {
      const estoqueAtualizado =
        await client.query(
          `
            UPDATE public.products
            SET
              stock = stock - $1,
              updated_at = NOW()
            WHERE id = $2
              AND stock >= $1
              AND active = true
            RETURNING id
          `,
          [
            item.quantidade,
            item.id,
          ],
        )

      if (
        estoqueAtualizado
          .rows.length === 0
      ) {
        await client.query(
          'ROLLBACK',
        )

        transacaoIniciada =
          false

        return NextResponse.json(
          {
            sucesso: false,
            erro:
              `O estoque de ${item.name} mudou enquanto o pedido era processado.`,
          },
          { status: 409 },
        )
      }
    }

    // =====================================================
    // FINALIZA TRANSAÇÃO
    // =====================================================

    await client.query(
      'COMMIT',
    )

    transacaoIniciada =
      false

    // =====================================================
    // NORMALIZA VALORES
    // =====================================================

    const numeroPedido =
      Number(
        pedido.order_number,
      )

    const pedidoCodigo =
      formatarNumeroPedido(
        numeroPedido,
      )

    const subtotalResposta =
      Number(
        pedido.subtotal,
      )

    const freteResposta =
      Number(
        pedido.shipping,
      )

    const totalResposta =
      Number(
        pedido.total,
      )

    const trocoResposta =
      pedido.change_for !==
      null
        ? Number(
            pedido.change_for,
          )
        : null

    // =====================================================
    // RESPOSTA FINAL
    // =====================================================

    return NextResponse.json(
      {
        sucesso: true,

        pedidoId:
          String(
            pedido.id,
          ),

        orderNumber:
          numeroPedido,

        numeroPedido:
          pedidoCodigo,

        pedido: {
          ...pedido,

          id: String(
            pedido.id,
          ),

          customer_id:
            pedido.customer_id
              ? String(
                  pedido.customer_id,
                )
              : null,

          order_number:
            numeroPedido,

          numeroPedido:
            pedidoCodigo,

          subtotal:
            subtotalResposta,

          shipping:
            freteResposta,

          total:
            totalResposta,

          change_for:
            trocoResposta,

          freteACombinar,
        },

        subtotal:
          subtotalResposta,

        frete:
          freteResposta,

        total:
          totalResposta,

        freteACombinar,

        status:
          pedido.status,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    // =====================================================
    // ROLLBACK DE SEGURANÇA
    // =====================================================

    if (transacaoIniciada) {
      try {
        await client.query(
          'ROLLBACK',
        )
      } catch {}
    }

    // =====================================================
    // ERRO REAL — DESENVOLVIMENTO
    // =====================================================

    console.error(
      '========================================',
    )

    console.error(
      'ERRO REAL AO CRIAR PEDIDO:',
    )

    console.error(error)

    console.error(
      '========================================',
    )

    const mensagem =
      error instanceof Error
        ? error.message
        : String(error)

    return NextResponse.json(
      {
        sucesso: false,
        erro: mensagem,
      },
      { status: 500 },
    )
  } finally {
    client.release()
  }
}
