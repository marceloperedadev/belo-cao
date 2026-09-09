import { Pool, type PoolClient } from '@neondatabase/serverless'

export const runtime = 'nodejs'

const databaseUrl = process.env.DATABASE_URL

/* =========================================================
   ERRO CONTROLADO
   ========================================================= */

class PedidoConflitoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PedidoConflitoError'
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function textoSeguro(valor: unknown): string {
  if (typeof valor !== 'string') {
    return ''
  }

  return valor.trim()
}

function numeroSeguro(valor: unknown): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 0
  }

  const numero =
    typeof valor === 'number'
      ? valor
      : Number(
          String(valor).replace(',', '.'),
        )

  return Number.isFinite(numero)
    ? numero
    : 0
}

function inteiroPositivo(
  valor: unknown,
): number {
  const numero = Number(valor)

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    return 0
  }

  return numero
}

function uuidValido(
  valor: unknown,
): boolean {
  if (typeof valor !== 'string') {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  )
}

/* =========================================================
   WHATSAPP — NORMALIZAÇÃO
   ========================================================= */

function normalizarWhatsApp(
  valor: unknown,
): string {
  let numero = textoSeguro(valor).replace(
    /\D/g,
    '',
  )

  if (!numero) {
    return ''
  }

  /*
   * Se já possui código do Brasil,
   * mantém.
   */
  if (numero.startsWith('55')) {
    return numero
  }

  /*
   * Números brasileiros sem código
   * do país.
   */
  if (
    numero.length === 10 ||
    numero.length === 11
  ) {
    return `55${numero}`
  }

  return numero
}

/* =========================================================
   POST /api/pedidos
   ========================================================= */

export async function POST(
  request: Request,
) {
  let client: PoolClient | null = null
  let pool: Pool | null = null
  let transacaoIniciada = false

  try {
    /* =====================================================
       DATABASE
       ===================================================== */

    if (!databaseUrl) {
      console.error(
        'DATABASE_URL não configurada.',
      )

      return Response.json(
        {
          sucesso: false,
          erro: 'Banco de dados não configurado.',
        },
        { status: 500 },
      )
    }

    /* =====================================================
       BODY
       ===================================================== */

    let body: any

    try {
      body = await request.json()
    } catch {
      return Response.json(
        {
          sucesso: false,
          erro: 'JSON inválido.',
        },
        { status: 400 },
      )
    }

    /* =====================================================
       CLIENTE
       ===================================================== */

    const cliente = body?.cliente

    if (
      !cliente ||
      typeof cliente !== 'object'
    ) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Informe os dados do cliente.',
        },
        { status: 400 },
      )
    }

    const nome = textoSeguro(
      cliente.nome,
    )

    const whatsappBruto =
      textoSeguro(
        cliente.whatsapp ||
          cliente.telefone,
      )

    const whatsapp =
      normalizarWhatsApp(
        whatsappBruto,
      )

    const cep = textoSeguro(
      cliente.cep,
    )

    const rua = textoSeguro(
      cliente.rua ||
        cliente.street,
    )

    const numero = textoSeguro(
      cliente.numero,
    )

    const complemento =
      textoSeguro(
        cliente.complemento,
      )

    const bairro = textoSeguro(
      cliente.bairro ||
        cliente.neighborhood,
    )

    const cidade = textoSeguro(
      cliente.cidade ||
        cliente.city,
    )

    const referencia =
      textoSeguro(
        cliente.referencia ||
          cliente.pontoReferencia ||
          cliente.reference_point,
      )

    /* =====================================================
       VALIDAÇÕES DO CLIENTE
       ===================================================== */

    if (!nome) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Informe o nome.',
        },
        { status: 400 },
      )
    }

    if (!whatsapp) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Informe o WhatsApp.',
        },
        { status: 400 },
      )
    }

    if (
      whatsapp.length < 12 ||
      whatsapp.length > 13
    ) {
      return Response.json(
        {
          sucesso: false,
          erro: 'WhatsApp inválido.',
        },
        { status: 400 },
      )
    }

    /* =====================================================
       FORMA DE ENTREGA
       ===================================================== */

    const tipoEntrega =
      textoSeguro(
        body.formaEntrega ||
          body.tipoEntrega ||
          body.entrega ||
          'retirada',
      )

    if (
      tipoEntrega !== 'entrega' &&
      tipoEntrega !== 'retirada'
    ) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Tipo de entrega inválido.',
        },
        { status: 400 },
      )
    }

    /* =====================================================
       FRETE
       =====================================================

       REGRA:

       ENTREGA:
       - Se o frete não foi definido:
         freteACombinar = true
         shipping no banco = 0
       - Se no futuro for informado um
         valor de frete:
         freteACombinar = false

       RETIRADA:
       - frete = 0
       - freteACombinar = false
       ===================================================== */

    const freteFoiInformado =
      body.frete !== null &&
      body.frete !== undefined &&
      body.frete !== ''

    let frete = 0

    if (freteFoiInformado) {
      frete = numeroSeguro(
        body.frete,
      )
    }

    if (frete < 0) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Valor de frete inválido.',
        },
        { status: 400 },
      )
    }

    const freteACombinar =
      tipoEntrega === 'entrega' &&
      !freteFoiInformado

    /*
     * Segurança adicional:
     *
     * Retirada nunca possui frete.
     */
    if (
      tipoEntrega === 'retirada'
    ) {
      frete = 0
    }

    /* =====================================================
       PAGAMENTO
       ===================================================== */

    const formaPagamento =
      textoSeguro(
        body.formaPagamento,
      )

    if (!formaPagamento) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Informe a forma de pagamento.',
        },
        { status: 400 },
      )
    }

    let trocoPara:
      | number
      | null = null

    if (
      body.trocoPara !== null &&
      body.trocoPara !== undefined &&
      body.trocoPara !== ''
    ) {
      const valorTroco =
        numeroSeguro(
          body.trocoPara,
        )

      if (valorTroco < 0) {
        return Response.json(
          {
            sucesso: false,
            erro: 'Valor de troco inválido.',
          },
          { status: 400 },
        )
      }

      trocoPara = valorTroco
    }

    /* =====================================================
       ITENS
       ===================================================== */

    if (
      !Array.isArray(body.itens) ||
      body.itens.length === 0
    ) {
      return Response.json(
        {
          sucesso: false,
          erro: 'O carrinho está vazio.',
        },
        { status: 400 },
      )
    }

    /* =====================================================
       NORMALIZAR ITENS
       ===================================================== */

    const mapaItens =
      new Map<string, number>()

    for (const item of body.itens) {
      const produtoId =
        textoSeguro(item?.id)

      const quantidade =
        inteiroPositivo(
          item?.quantidade,
        )

      if (
        !uuidValido(produtoId)
      ) {
        return Response.json(
          {
            sucesso: false,
            erro: 'Produto inválido.',
          },
          { status: 400 },
        )
      }

      if (!quantidade) {
        return Response.json(
          {
            sucesso: false,
            erro: 'Quantidade inválida.',
          },
          { status: 400 },
        )
      }

      const quantidadeAtual =
        mapaItens.get(
          produtoId,
        ) || 0

      const novaQuantidade =
        quantidadeAtual +
        quantidade

      if (
        novaQuantidade > 999
      ) {
        return Response.json(
          {
            sucesso: false,
            erro: 'Quantidade máxima por produto excedida.',
          },
          { status: 400 },
        )
      }

      mapaItens.set(
        produtoId,
        novaQuantidade,
      )
    }

    if (
      mapaItens.size === 0
    ) {
      return Response.json(
        {
          sucesso: false,
          erro: 'O carrinho está vazio.',
        },
        { status: 400 },
      )
    }

    if (
      mapaItens.size > 100
    ) {
      return Response.json(
        {
          sucesso: false,
          erro: 'Quantidade de produtos no pedido excedida.',
        },
        { status: 400 },
      )
    }

    const itensNormalizados =
      Array.from(
        mapaItens.entries(),
      ).map(
        ([id, quantidade]) => ({
          id,
          quantidade,
        }),
      )

    const produtoIds =
      itensNormalizados.map(
        (item) => item.id,
      )

    /* =====================================================
       POOL
       ===================================================== */

    pool = new Pool({
      connectionString:
        databaseUrl,
    })

    client =
      await pool.connect()

    /* =====================================================
       TRANSAÇÃO
       ===================================================== */

    await client.query(
      'BEGIN',
    )

    transacaoIniciada = true

    /* =====================================================
       BUSCAR / CRIAR CLIENTE
       ===================================================== */

    const clienteExistenteResult =
      await client.query(
        `
          SELECT
            id,
            name,
            whatsapp,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            reference_point
          FROM public.customers
          WHERE whatsapp = $1
          FOR UPDATE
        `,
        [whatsapp],
      )

    let customerId: string

    /* =====================================================
       CLIENTE EXISTENTE
       ===================================================== */

    if (
      clienteExistenteResult.rowCount &&
      clienteExistenteResult.rowCount >
        0
    ) {
      const clienteExistente =
        clienteExistenteResult
          .rows[0]

      customerId =
        clienteExistente.id

      /*
       * Atualiza os dados mais recentes.
       *
       * Campos vazios não apagam
       * dados anteriores.
       */
      const clienteAtualizadoResult =
        await client.query(
          `
            UPDATE public.customers
            SET
              name = COALESCE(
                NULLIF($1, ''),
                name
              ),

              cep = COALESCE(
                NULLIF($2, ''),
                cep
              ),

              street = COALESCE(
                NULLIF($3, ''),
                street
              ),

              number = COALESCE(
                NULLIF($4, ''),
                number
              ),

              complement = COALESCE(
                NULLIF($5, ''),
                complement
              ),

              neighborhood = COALESCE(
                NULLIF($6, ''),
                neighborhood
              ),

              city = COALESCE(
                NULLIF($7, ''),
                city
              ),

              reference_point = COALESCE(
                NULLIF($8, ''),
                reference_point
              ),

              updated_at = NOW()

            WHERE id = $9::uuid

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
              reference_point
          `,
          [
            nome,
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            referencia,
            customerId,
          ],
        )

      const clienteAtualizado =
        clienteAtualizadoResult
          .rows[0]

      customerId =
        clienteAtualizado.id

      console.log(
        'Cliente existente encontrado:',
        customerId,
      )
    } else {
      /* ===================================================
         CLIENTE NOVO
         =================================================== */

      const novoClienteResult =
        await client.query(
          `
            INSERT INTO public.customers (
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
            )
            VALUES (
              gen_random_uuid(),
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
            complemento || null,
            bairro || null,
            cidade || null,
            referencia || null,
          ],
        )

      customerId =
        novoClienteResult
          .rows[0].id

      console.log(
        'Novo cliente criado:',
        customerId,
      )
    }

    /* =====================================================
       BUSCAR PRODUTOS E BLOQUEAR LINHAS
       ===================================================== */

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
          ORDER BY id
          FOR UPDATE
        `,
        [produtoIds],
      )

    const produtos =
      produtosResult.rows

    /* =====================================================
       VALIDAR EXISTÊNCIA DOS PRODUTOS
       ===================================================== */

    if (
      produtos.length !==
      produtoIds.length
    ) {
      const encontrados =
        new Set(
          produtos.map(
            (produto) =>
              produto.id,
          ),
        )

      const faltantes =
        produtoIds.filter(
          (id) =>
            !encontrados.has(id),
        )

      throw new PedidoConflitoError(
        `Produto(s) não encontrado(s): ${faltantes.join(
          ', ',
        )}`,
      )
    }

    /* =====================================================
       MAPA DE PRODUTOS
       ===================================================== */

    const produtosPorId =
      new Map(
        produtos.map(
          (produto) => [
            produto.id,
            produto,
          ],
        ),
      )

    /* =====================================================
       VALIDAR PRODUTOS E ESTOQUE
       ===================================================== */

    for (const item of itensNormalizados) {
      const produto =
        produtosPorId.get(
          item.id,
        )

      if (!produto) {
        throw new PedidoConflitoError(
          'Produto não encontrado.',
        )
      }

      if (!produto.active) {
        throw new PedidoConflitoError(
          `O produto "${produto.name}" não está disponível.`,
        )
      }

      const estoque =
        Number(produto.stock)

      if (
        !Number.isFinite(
          estoque,
        )
      ) {
        throw new PedidoConflitoError(
          `Estoque inválido para o produto "${produto.name}".`,
        )
      }

      if (
        estoque <
        item.quantidade
      ) {
        throw new PedidoConflitoError(
          `Estoque insuficiente para "${produto.name}". Disponível: ${estoque}.`,
        )
      }
    }

    /* =====================================================
       CALCULAR SUBTOTAL
       ===================================================== */

    let subtotal = 0

    const itensPedido =
      itensNormalizados.map(
        (item) => {
          const produto =
            produtosPorId.get(
              item.id,
            )!

          const precoUnitario =
            numeroSeguro(
              produto.price,
            )

          const subtotalItem =
            precoUnitario *
            item.quantidade

          subtotal +=
            subtotalItem

          return {
            produtoId:
              produto.id,

            nome:
              produto.name,

            quantidade:
              item.quantidade,

            precoUnitario,

            subtotal:
              subtotalItem,
          }
        },
      )

    /* =====================================================
       TOTAL
       =====================================================

       Se o frete ainda não foi
       combinado, o total armazenado
       representa somente os produtos.

       Exemplo:

       Produtos: R$ 11,90
       Frete: A combinar
       Total dos produtos: R$ 11,90
       */

    const total =
      subtotal + frete

    /* =====================================================
       VALIDAÇÃO DO TROCO
       ===================================================== */

    /*
     * Quando o frete é "A combinar",
     * o valor conhecido para conferência
     * é o subtotal.
     *
     * Quando o frete já está definido,
     * usamos o total completo.
     */
    const valorBaseParaTroco =
      freteACombinar
        ? subtotal
        : total

    if (
      formaPagamento.toLowerCase() ===
        'dinheiro' &&
      trocoPara !== null &&
      trocoPara > 0 &&
      trocoPara <
        valorBaseParaTroco
    ) {
      throw new PedidoConflitoError(
        `O valor informado para troco deve ser igual ou maior que R$ ${valorBaseParaTroco.toFixed(
          2,
        )}.`,
      )
    }

    /* =====================================================
       ID DO PEDIDO
       ===================================================== */

    const pedidoId =
      crypto.randomUUID()

    /* =====================================================
       STATUS INICIAL
       ===================================================== */

    const status =
      'recebido'

    /* =====================================================
       INSERIR PEDIDO
       ===================================================== */

    await client.query(
      `
        INSERT INTO public.orders (
          id,
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
          $1::uuid,
          $2::uuid,
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
          $17,
          $18,
          NOW(),
          NOW()
        )
      `,
      [
        pedidoId,
        customerId,
        nome,
        whatsapp,
        tipoEntrega,
        cep || null,
        rua || null,
        numero || null,
        complemento || null,
        bairro || null,
        cidade || null,
        referencia || null,
        formaPagamento,
        trocoPara,
        subtotal,

        /*
         * O banco exige shipping NOT NULL.
         *
         * Quando "A combinar":
         * armazenamos 0 internamente,
         * mas a API informa claramente
         * que o frete ainda não foi definido.
         */
        frete,

        total,
        status,
      ],
    )

    /* =====================================================
       INSERIR ITENS DO PEDIDO
       ===================================================== */

    for (const item of itensPedido) {
      const itemId =
        crypto.randomUUID()

      await client.query(
        `
          INSERT INTO public.order_items (
            id,
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4,
            $5,
            $6,
            $7
          )
        `,
        [
          itemId,
          pedidoId,
          item.produtoId,
          item.nome,
          item.quantidade,
          item.precoUnitario,
          item.subtotal,
        ],
      )
    }

    /* =====================================================
       BAIXAR ESTOQUE
       ===================================================== */

    for (const item of itensPedido) {
      const estoqueResult =
        await client.query(
          `
            UPDATE public.products
            SET
              stock = stock - $1,
              updated_at = NOW()
            WHERE id = $2::uuid
              AND active = TRUE
              AND stock >= $1
            RETURNING id, stock
          `,
          [
            item.quantidade,
            item.produtoId,
          ],
        )

      if (
        estoqueResult.rowCount !==
        1
      ) {
        throw new PedidoConflitoError(
          `Não foi possível atualizar o estoque de "${item.nome}".`,
        )
      }
    }

    /* =====================================================
       COMMIT
       ===================================================== */

    await client.query(
      'COMMIT',
    )

    transacaoIniciada = false

    /* =====================================================
       LOG
       ===================================================== */

    console.log(
      'Pedido criado com sucesso:',
      {
        pedidoId,
        customerId,
        whatsapp,
        tipoEntrega,
        subtotal,
        frete,
        freteACombinar,
        total,
        status,
      },
    )

    /* =====================================================
       RESPOSTA
       ===================================================== */

    return Response.json(
      {
        sucesso: true,

        pedidoId,

        customerId,

        /*
         * IMPORTANTE:
         *
         * Esta propriedade informa ao
         * Checkout que "0" não significa
         * frete grátis.
         */
        freteACombinar,

        pedido: {
          id: pedidoId,
          customerId,
          status,
          subtotal,
          frete,
          freteACombinar,
          total,
        },

        subtotal,

        /*
         * Internamente continua 0
         * quando ainda não combinado.
         */
        frete,

        /*
         * Quando entrega:
         * representa apenas os produtos.
         *
         * Quando retirada:
         * representa o total final.
         */
        total,

        status,

        cliente: {
          id: customerId,
          nome,
          whatsapp,
          cep,
          rua,
          numero,
          complemento,
          bairro,
          cidade,
          referencia,
        },

        itens:
          itensPedido.map(
            (item) => ({
              id:
                item.produtoId,

              nome:
                item.nome,

              quantidade:
                item.quantidade,

              precoUnitario:
                item.precoUnitario,

              subtotal:
                item.subtotal,
            }),
          ),
      },
      {
        status: 201,
      },
    )
  } catch (erro: any) {
    /* =====================================================
       ROLLBACK
       ===================================================== */

    if (
      client &&
      transacaoIniciada
    ) {
      try {
        await client.query(
          'ROLLBACK',
        )
      } catch (
        rollbackErro
      ) {
        console.error(
          'Erro ao executar ROLLBACK:',
          rollbackErro,
        )
      }
    }

    /* =====================================================
       ERRO CONTROLADO
       ===================================================== */

    if (
      erro instanceof
      PedidoConflitoError
    ) {
      console.warn(
        'Conflito ao criar pedido:',
        erro.message,
      )

      return Response.json(
        {
          sucesso: false,
          erro: erro.message,
        },
        {
          status: 409,
        },
      )
    }

    /* =====================================================
       ERRO DO POSTGRES
       ===================================================== */

    console.error(
      'Erro ao criar pedido:',
      erro,
    )

    return Response.json(
      {
        sucesso: false,
        erro:
          'Não foi possível finalizar o pedido.',
      },
      {
        status: 500,
      },
    )
  } finally {
    /* =====================================================
       LIBERAR CLIENTE
       ===================================================== */

    if (client) {
      client.release()
    }

    /* =====================================================
       ENCERRAR POOL
       ===================================================== */

    if (pool) {
      try {
        await pool.end()
      } catch (
        erroPool
      ) {
        console.error(
          'Erro ao encerrar pool:',
          erroPool,
        )
      }
    }
  }
}