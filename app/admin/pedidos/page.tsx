
'use client'

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  User,
  X,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import styles from './Pedidos.module.css'

/* =========================================================
   TIPOS
   ========================================================= */

type ItemPedido = {
  id: string
  produtoId: string | null
  nome: string
  quantidade: number
  precoUnitario: number
  subtotal: number
}

type Pedido = {
  id: string
  orderNumber: number | string
  numeroPedido: string

  cliente: {
    id: string | null
    nome: string
    whatsapp: string
  }

  entrega: {
    tipo: string
    cep: string | null
    rua: string | null
    numero: string | null
    complemento: string | null
    bairro: string | null
    cidade: string | null
    referencia: string | null
  }

  pagamento: {
    forma: string
    trocoPara: number | null
  }

  valores: {
    subtotal: number
    frete: number
    total: number
  }

  itens: ItemPedido[]

  status: string

  /* Controle manual do estoque */
  estoqueDevolvido: boolean
  estoqueDevolvidoEm: string | null

  criadoEm: string
  atualizadoEm: string
}

/* =========================================================
   RESPOSTA DA API
   ========================================================= */

type PedidoApi = {
  id: string
  order_number: number | string

  customer_id: string | null
  customer_name: string
  customer_whatsapp: string

  delivery_type: string
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  reference_point: string | null

  payment_method: string
  change_for: number | string | null

  subtotal: number | string
  shipping: number | string
  total: number | string

  status: string

  /* Controle de devolução */
  stock_restored: boolean
  stock_restored_at: string | null

  created_at: string
  updated_at: string

  items: ItemApi[]
}

type ItemApi = {
  id: string
  product_id: string | null
  product_name: string
  quantity: number | string
  unit_price: number | string
  subtotal: number | string
}

type RespostaPedidos = {
  sucesso: boolean
  pedidos: PedidoApi[]
  totalPedidos: number
  valorTotal: number | string

  filtros?: {
    status: string
    limite: number
  }

  erro?: string
  mensagem?: string
}

type RespostaEstoque = {
  sucesso: boolean
  mensagem?: string
  erro?: string

  estoqueDevolvido?: boolean

  pedido?: {
    id: string
    order_number: number | string
    status: string
    stock_restored: boolean
    stock_restored_at: string | null
    updated_at: string
  }

  itens?: Array<{
    productId: string
    productName: string
    quantity: number
    stockAtual: number
  }>
}

/* =========================================================
   STATUS
   ========================================================= */

const STATUS = [
  'todos',
  'recebido',
  'confirmado',
  'em_preparo',
  'saiu_para_entrega',
  'concluido',
  'cancelado',
] as const

type StatusPedido = (typeof STATUS)[number]

type StatusAtualizavel = Exclude<
  StatusPedido,
  'todos'
>

const TRANSICOES_STATUS: Record<
  StatusAtualizavel,
  StatusAtualizavel[]
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

function numeroSeguro(
  valor:
    | number
    | string
    | null
    | undefined,
): number {
  const numero = Number(valor)

  return Number.isFinite(numero)
    ? numero
    : 0
}

function textoSeguro(
  valor: unknown,
): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor)
}

/* =========================================================
   NORMALIZAR PEDIDO
   ========================================================= */

function normalizarPedido(
  pedido: PedidoApi,
): Pedido {
  const orderNumber =
    pedido.order_number

  const numeroPedido =
    typeof orderNumber === 'number'
      ? `#${String(
          orderNumber,
        ).padStart(5, '0')}`
      : String(
          orderNumber,
        ).startsWith('#')
        ? String(orderNumber)
        : `#${String(
            orderNumber,
          ).padStart(5, '0')}`

  return {
    id: pedido.id,

    orderNumber,

    numeroPedido,

    cliente: {
      id:
        pedido.customer_id ??
        null,

      nome:
        textoSeguro(
          pedido.customer_name,
        ) || 'Cliente',

      whatsapp:
        textoSeguro(
          pedido.customer_whatsapp,
        ),
    },

    entrega: {
      tipo:
        textoSeguro(
          pedido.delivery_type,
        ),

      cep:
        pedido.cep ?? null,

      rua:
        pedido.street ?? null,

      numero:
        pedido.number ?? null,

      complemento:
        pedido.complement ??
        null,

      bairro:
        pedido.neighborhood ??
        null,

      cidade:
        pedido.city ?? null,

      referencia:
        pedido.reference_point ??
        null,
    },

    pagamento: {
      forma:
        textoSeguro(
          pedido.payment_method,
        ),

      trocoPara:
        pedido.change_for ===
          null ||
        pedido.change_for ===
          undefined
          ? null
          : numeroSeguro(
              pedido.change_for,
            ),
    },

    valores: {
      subtotal:
        numeroSeguro(
          pedido.subtotal,
        ),

      frete:
        numeroSeguro(
          pedido.shipping,
        ),

      total:
        numeroSeguro(
          pedido.total,
        ),
    },

    itens: Array.isArray(
      pedido.items,
    )
      ? pedido.items.map(
          (item) => ({
            id: item.id,

            produtoId:
              item.product_id ??
              null,

            nome:
              textoSeguro(
                item.product_name,
              ) || 'Produto',

            quantidade:
              numeroSeguro(
                item.quantity,
              ),

            precoUnitario:
              numeroSeguro(
                item.unit_price,
              ),

            subtotal:
              numeroSeguro(
                item.subtotal,
              ),
          }),
        )
      : [],

    status:
      textoSeguro(
        pedido.status,
      ),

    estoqueDevolvido:
      Boolean(
        pedido.stock_restored,
      ),

    estoqueDevolvidoEm:
      pedido.stock_restored_at ??
      null,

    criadoEm:
      textoSeguro(
        pedido.created_at,
      ),

    atualizadoEm:
      textoSeguro(
        pedido.updated_at,
      ),
  }
}

/* =========================================================
   FORMATAÇÃO
   ========================================================= */

function formatarPreco(
  valor: number,
) {
  return valor.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  )
}

function formatarData(
  data: string,
) {
  if (!data) {
    return '—'
  }

  const dataObj =
    new Date(data)

  if (
    Number.isNaN(
      dataObj.getTime(),
    )
  ) {
    return '—'
  }

  return dataObj.toLocaleString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function formatarStatus(
  status: string,
) {
  switch (status) {
    case 'todos':
      return 'Todos'

    case 'recebido':
      return 'Recebido'

    case 'confirmado':
      return 'Confirmado'

    case 'em_preparo':
      return 'Em preparo'

    case 'saiu_para_entrega':
      return 'Saiu para entrega'

    case 'concluido':
      return 'Concluído'

    case 'cancelado':
      return 'Cancelado'

    default:
      return status
  }
}

function classeStatus(
  status: string,
) {
  switch (status) {
    case 'recebido':
      return 'recebido'

    case 'confirmado':
      return 'confirmado'

    case 'em_preparo':
      return 'em_preparo'

    case 'saiu_para_entrega':
      return 'saiu_para_entrega'

    case 'concluido':
      return 'concluido'

    case 'cancelado':
      return 'cancelado'

    default:
      return 'recebido'
  }
}

function formatarPagamento(
  forma: string,
) {
  switch (
    forma
      .toLowerCase()
      .trim()
  ) {
    case 'pix':
      return 'Pix'

    case 'dinheiro':
      return 'Dinheiro'

    case 'cartao':
    case 'cartão':
      return 'Cartão'

    default:
      return forma || '—'
  }
}

function formatarTipoEntrega(
  tipo: string,
) {
  switch (
    tipo
      .toLowerCase()
      .trim()
  ) {
    case 'entrega':
      return 'Entrega'

    case 'retirada':
    case 'pickup':
      return 'Retirada'

    default:
      return tipo || '—'
  }
}

function normalizarWhatsApp(
  numero: string,
) {
  return String(
    numero || '',
  ).replace(
    /\D/g,
    '',
  )
}

/* =========================================================
   STATUS DISPONÍVEIS
   ========================================================= */

function obterStatusDisponiveis(
  statusAtual: string,
): StatusAtualizavel[] {
  if (
    statusAtual !==
      'recebido' &&
    statusAtual !==
      'confirmado' &&
    statusAtual !==
      'em_preparo' &&
    statusAtual !==
      'saiu_para_entrega' &&
    statusAtual !==
      'concluido' &&
    statusAtual !==
      'cancelado'
  ) {
    return []
  }

  return TRANSICOES_STATUS[
    statusAtual as StatusAtualizavel
  ]
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function PedidosPage() {
  const [
    pedidos,
    setPedidos,
  ] = useState<Pedido[]>([])

  const [
    carregando,
    setCarregando,
  ] = useState(true)

  const [
    atualizando,
    setAtualizando,
  ] = useState(false)

  const [
    erro,
    setErro,
  ] = useState('')

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<StatusPedido>(
      'todos',
    )

  const [
    pedidoAberto,
    setPedidoAberto,
  ] = useState<
    string | null
  >(null)

  const [
    statusSalvando,
    setStatusSalvando,
  ] = useState<
    string | null
  >(null)

  const [
    statusSucesso,
    setStatusSucesso,
  ] = useState<
    string | null
  >(null)

  const [
    estoqueSalvando,
    setEstoqueSalvando,
  ] = useState<
    string | null
  >(null)

  const [
    estoqueSucesso,
    setEstoqueSucesso,
  ] = useState<
    string | null
  >(null)

  /* =======================================================
     CARREGAR PEDIDOS
     ======================================================= */

  const carregarPedidos =
    useCallback(
      async (
        mostrarCarregando = true,
      ) => {
        try {
          if (
            mostrarCarregando
          ) {
            setCarregando(
              true,
            )
          } else {
            setAtualizando(
              true,
            )
          }

          setErro('')

          const response =
            await fetch(
              '/api/admin/pedidos?limit=100',
              {
                method: 'GET',
                cache: 'no-store',
              },
            )

          const data: RespostaPedidos =
            await response.json()

          if (
            !response.ok ||
            !data.sucesso
          ) {
            throw new Error(
              data.mensagem ||
                data.erro ||
                'Não foi possível carregar os pedidos.',
            )
          }

          const pedidosNormalizados =
            Array.isArray(
              data.pedidos,
            )
              ? data.pedidos.map(
                  normalizarPedido,
                )
              : []

          setPedidos(
            pedidosNormalizados,
          )
        } catch (error) {
          console.error(
            error,
          )

          setErro(
            error instanceof
              Error
              ? error.message
              : 'Não foi possível carregar os pedidos.',
          )
        } finally {
          setCarregando(
            false,
          )

          setAtualizando(
            false,
          )
        }
      },
      [],
    )

  /* =======================================================
     PRIMEIRO CARREGAMENTO
     ======================================================= */

  useEffect(() => {
    carregarPedidos(true)
  }, [
    carregarPedidos,
  ])

  /* =======================================================
     ATUALIZAÇÃO AUTOMÁTICA
     ======================================================= */

  useEffect(() => {
    const intervalo =
      window.setInterval(
        () => {
          carregarPedidos(
            false,
          )
        },
        30000,
      )

    return () => {
      window.clearInterval(
        intervalo,
      )
    }
  }, [
    carregarPedidos,
  ])

  /* =======================================================
     ALTERAR STATUS
     ======================================================= */

  async function alterarStatus(
    pedidoId: string,
    novoStatus: string,
  ) {
    const pedido =
      pedidos.find(
        (item) =>
          item.id ===
          pedidoId,
      )

    if (!pedido) {
      return
    }

    const statusDisponiveis =
      obterStatusDisponiveis(
        pedido.status,
      )

    if (
      !statusDisponiveis.includes(
        novoStatus as StatusAtualizavel,
      )
    ) {
      setErro(
        `Não é possível alterar o pedido de "${formatarStatus(
          pedido.status,
        )}" para "${formatarStatus(
          novoStatus,
        )}".`,
      )

      return
    }

    try {
      setStatusSalvando(
        pedidoId,
      )

      setStatusSucesso(
        null,
      )

      setErro('')

      const response =
        await fetch(
          '/api/admin/pedidos',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              pedidoId,
              status:
                novoStatus,
            }),
          },
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data.sucesso
      ) {
        throw new Error(
          data.mensagem ||
            data.erro ||
            'Não foi possível atualizar o status.',
        )
      }

      setPedidos(
        (
          pedidosAtuais,
        ) =>
          pedidosAtuais.map(
            (
              pedidoAtual,
            ) =>
              pedidoAtual.id ===
              pedidoId
                ? {
                    ...pedidoAtual,

                    status:
                      novoStatus,

                    atualizadoEm:
                      data.pedido
                        ?.updated_at ||
                      data.pedido
                        ?.atualizadoEm ||
                      new Date().toISOString(),
                  }
                : pedidoAtual,
          ),
      )

      setStatusSucesso(
        pedidoId,
      )

      window.setTimeout(
        () => {
          setStatusSucesso(
            (atual) =>
              atual ===
              pedidoId
                ? null
                : atual,
          )
        },
        2000,
      )

      await carregarPedidos(
        false,
      )
    } catch (error) {
      console.error(
        error,
      )

      setErro(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível atualizar o status.',
      )
    } finally {
      setStatusSalvando(
        null,
      )
    }
  }

  /* =======================================================
     DEVOLVER PRODUTOS AO ESTOQUE
     ======================================================= */

  async function devolverEstoque(
    pedido: Pedido,
  ) {
    /*
     * Segurança 1:
     * somente pedido cancelado.
     */
    if (
      pedido.status !==
      'cancelado'
    ) {
      setErro(
        'Só é possível devolver o estoque de um pedido cancelado.',
      )

      return
    }

    /*
     * Segurança 2:
     * não permitir segunda devolução.
     */
    if (
      pedido.estoqueDevolvido
    ) {
      setErro(
        'O estoque deste pedido já foi devolvido.',
      )

      return
    }

    /*
     * Confirmação antes de alterar
     * o estoque.
     */
    const confirmou =
      window.confirm(
        `Deseja devolver os produtos do pedido ${pedido.numeroPedido} ao estoque?\n\nEssa ação não poderá ser repetida.`,
      )

    if (!confirmou) {
      return
    }

    try {
      setEstoqueSalvando(
        pedido.id,
      )

      setEstoqueSucesso(
        null,
      )

      setErro('')

      /*
       * Endpoint específico da devolução.
       */
      const response =
        await fetch(
          '/api/admin/pedidos/estoque',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              pedidoId:
                pedido.id,
            }),
          },
        )

      const data: RespostaEstoque =
        await response.json()

      if (
        !response.ok ||
        !data.sucesso
      ) {
        throw new Error(
          data.mensagem ||
            data.erro ||
            'Não foi possível devolver os produtos ao estoque.',
        )
      }

      /*
       * Atualiza imediatamente a interface.
       */
      setPedidos(
        (
          pedidosAtuais,
        ) =>
          pedidosAtuais.map(
            (
              pedidoAtual,
            ) =>
              pedidoAtual.id ===
              pedido.id
                ? {
                    ...pedidoAtual,

                    estoqueDevolvido:
                      true,

                    estoqueDevolvidoEm:
                      data.pedido
                        ?.stock_restored_at ??
                      new Date().toISOString(),

                    atualizadoEm:
                      data.pedido
                        ?.updated_at ||
                      new Date().toISOString(),
                  }
                : pedidoAtual,
          ),
      )

      /*
       * Mostra confirmação visual.
       */
      setEstoqueSucesso(
        pedido.id,
      )

      /*
       * Sincroniza com o banco.
       */
      await carregarPedidos(
        false,
      )
    } catch (error) {
      console.error(
        error,
      )

      setErro(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível devolver os produtos ao estoque.',
      )
    } finally {
      setEstoqueSalvando(
        null,
      )
    }
  }

  /* =======================================================
     FILTROS
     ======================================================= */

  const pedidosFiltrados =
    useMemo(() => {
      if (
        filtroStatus ===
        'todos'
      ) {
        return pedidos
      }

      return pedidos.filter(
        (pedido) =>
          pedido.status ===
          filtroStatus,
      )
    }, [
      pedidos,
      filtroStatus,
    ])

  /* =======================================================
     MÉTRICAS
     ======================================================= */

  const totalPedidos =
    pedidos.length

  const aguardando =
    pedidos.filter(
      (pedido) =>
        pedido.status ===
        'recebido',
    ).length

  const emPreparo =
    pedidos.filter(
      (pedido) =>
        pedido.status ===
          'confirmado' ||
        pedido.status ===
          'em_preparo' ||
        pedido.status ===
          'saiu_para_entrega',
    ).length

  const faturamento =
    pedidos
      .filter(
        (pedido) =>
          pedido.status !==
          'cancelado',
      )
      .reduce(
        (
          total,
          pedido,
        ) =>
          total +
          numeroSeguro(
            pedido.valores
              .total,
          ),
        0,
      )

  /* =======================================================
     WHATSAPP
     ======================================================= */

  function abrirWhatsApp(
    pedido: Pedido,
  ) {
    const numero =
      normalizarWhatsApp(
        pedido.cliente
          .whatsapp,
      )

    if (!numero) {
      return
    }

    const mensagem =
      `Olá, ${pedido.cliente.nome}! Aqui é da Belo Cão. Estou entrando em contato sobre o seu pedido ${pedido.numeroPedido}.`

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        mensagem,
      )}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  /* =======================================================
     ABRIR / FECHAR PEDIDO
     ======================================================= */

  function alternarPedido(
    id: string,
  ) {
    setPedidoAberto(
      (atual) =>
        atual === id
          ? null
          : id,
    )
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <main
      className={
        styles.pagina
      }
    >
      <div
        className={
          styles.container
        }
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <header
          className={
            styles.header
          }
        >
          <div
            className={
              styles.headerEsquerda
            }
          >
            <button
              type="button"
              className={
                styles.voltar
              }
              onClick={() => {
                window.location.href =
                  '/loja'
              }}
              aria-label="Voltar para a loja"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <span
                className={
                  styles.eyebrow
                }
              >
                BELO CÃO
              </span>

              <h1>
                Pedidos
              </h1>

              <p>
                Acompanhe e gerencie os
                pedidos da loja.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.atualizar
            }
            onClick={() =>
              carregarPedidos(
                false,
              )
            }
            disabled={
              atualizando
            }
          >
            {atualizando ? (
              <Loader2
                size={17}
                className={
                  styles.spinner
                }
              />
            ) : (
              <RefreshCw
                size={17}
              />
            )}

            {atualizando
              ? 'Atualizando...'
              : 'Atualizar'}
          </button>
        </header>

        {/* =================================================
            ERRO
            ================================================= */}

        {erro && (
          <div
            className={
              styles.erro
            }
          >
            <div
              className={
                styles.erroIcone
              }
            >
              <X
                size={17}
              />
            </div>

            <span>
              {erro}
            </span>

            <button
              type="button"
              onClick={() =>
                setErro('')
              }
              aria-label="Fechar erro"
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {/* =================================================
            MÉTRICAS
            ================================================= */}

        <section
          className={
            styles.metricas
          }
        >
          <article
            className={
              styles.metrica
            }
          >
            <div
              className={
                styles.metricaIcone
              }
            >
              <ShoppingBag
                size={20}
              />
            </div>

            <div>
              <span>
                Total de pedidos
              </span>

              <strong>
                {totalPedidos}
              </strong>
            </div>
          </article>

          <article
            className={
              styles.metrica
            }
          >
            <div
              className={
                styles.metricaIcone
              }
            >
              <Clock3
                size={20}
              />
            </div>

            <div>
              <span>
                Aguardando
              </span>

              <strong>
                {aguardando}
              </strong>
            </div>
          </article>

          <article
            className={
              styles.metrica
            }
          >
            <div
              className={
                styles.metricaIcone
              }
            >
              <Package
                size={20}
              />
            </div>

            <div>
              <span>
                Em andamento
              </span>

              <strong>
                {emPreparo}
              </strong>
            </div>
          </article>

          <article
            className={
              styles.metrica
            }
          >
            <div
              className={
                styles.metricaIcone
              }
            >
              <TrendingUp
                size={20}
              />
            </div>

            <div>
              <span>
                Faturamento
              </span>

              <strong>
                {formatarPreco(
                  faturamento,
                )}
              </strong>
            </div>
          </article>
        </section>

        {/* =================================================
            FILTROS
            ================================================= */}

        <section
          className={
            styles.filtros
          }
        >
          <div
            className={
              styles.filtrosTitulo
            }
          >
            <span>
              Pedidos
            </span>

            <small>
              {
                pedidosFiltrados.length
              }{' '}
              {pedidosFiltrados.length ===
              1
                ? 'pedido'
                : 'pedidos'}
            </small>
          </div>

          <div
            className={
              styles.filtrosLista
            }
          >
            {STATUS.map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  className={
                    filtroStatus ===
                    status
                      ? styles.filtroAtivo
                      : styles.filtro
                  }
                  onClick={() =>
                    setFiltroStatus(
                      status,
                    )
                  }
                >
                  {formatarStatus(
                    status,
                  )}

                  {status !==
                    'todos' && (
                    <span>
                      {
                        pedidos.filter(
                          (
                            pedido,
                          ) =>
                            pedido.status ===
                            status,
                        ).length
                      }
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        </section>

        {/* =================================================
            ESTADOS
            ================================================= */}

        {carregando ? (
          <section
            className={
              styles.estado
            }
          >
            <Loader2
              size={28}
              className={
                styles.spinner
              }
            />

            <strong>
              Carregando pedidos...
            </strong>

            <span>
              Buscando os pedidos mais
              recentes.
            </span>
          </section>
        ) : pedidosFiltrados.length ===
          0 ? (
          <section
            className={
              styles.estado
            }
          >
            <div
              className={
                styles.estadoIcone
              }
            >
              <ShoppingBag
                size={26}
              />
            </div>

            <strong>
              Nenhum pedido encontrado
            </strong>

            <span>
              Não existem pedidos nesse
              filtro no momento.
            </span>
          </section>
        ) : (
          <section
            className={
              styles.lista
            }
          >
            {pedidosFiltrados.map(
              (pedido) => {
                const aberto =
                  pedidoAberto ===
                  pedido.id

                const salvando =
                  statusSalvando ===
                  pedido.id

                const atualizado =
                  statusSucesso ===
                  pedido.id

                const salvandoEstoque =
                  estoqueSalvando ===
                  pedido.id

                const estoqueAtualizado =
                  estoqueSucesso ===
                  pedido.id

                const statusDisponiveis =
                  obterStatusDisponiveis(
                    pedido.status,
                  )

                const podeAlterarStatus =
                  statusDisponiveis.length >
                  0

                const podeDevolverEstoque =
                  pedido.status ===
                    'cancelado' &&
                  !pedido.estoqueDevolvido

                return (
                  <article
                    key={
                      pedido.id
                    }
                    className={`${styles.pedido} ${
                      aberto
                        ? styles.pedidoAberto
                        : ''
                    }`}
                  >
                    {/* =================================
                        RESUMO
                        ================================= */}

                    <button
                      type="button"
                      className={
                        styles.pedidoResumo
                      }
                      onClick={() =>
                        alternarPedido(
                          pedido.id,
                        )
                      }
                    >
                      <div
                        className={
                          styles.pedidoNumero
                        }
                      >
                        <div
                          className={
                            styles.pedidoChevron
                          }
                        >
                          {aberto ? (
                            <ChevronDown
                              size={18}
                            />
                          ) : (
                            <ChevronRight
                              size={18}
                            />
                          )}
                        </div>

                        <div>
                          <strong>
                            {
                              pedido.numeroPedido
                            }
                          </strong>

                          <span>
                            {formatarData(
                              pedido.criadoEm,
                            )}
                          </span>
                        </div>
                      </div>

                      <div
                        className={
                          styles.cliente
                        }
                      >
                        <div
                          className={
                            styles.clienteIcone
                          }
                        >
                          <User
                            size={16}
                          />
                        </div>

                        <div>
                          <strong>
                            {
                              pedido
                                .cliente
                                .nome
                            }
                          </strong>

                          <span>
                            {
                              pedido
                                .cliente
                                .whatsapp
                            }
                          </span>
                        </div>
                      </div>

                      <div
                        className={
                          styles.tipoEntrega
                        }
                      >
                        <span>
                          {formatarTipoEntrega(
                            pedido
                              .entrega
                              .tipo,
                          )}
                        </span>
                      </div>

                      <div
                        className={`${styles.status} ${
                          styles[
                            `status-${classeStatus(
                              pedido.status,
                            )}` as keyof typeof styles
                          ]
                        }`}
                      >
                        {formatarStatus(
                          pedido.status,
                        )}
                      </div>

                      <strong
                        className={
                          styles.total
                        }
                      >
                        {formatarPreco(
                          pedido
                            .valores
                            .total,
                        )}
                      </strong>
                    </button>

                    {/* =================================
                        DETALHES
                        ================================= */}

                    {aberto && (
                      <div
                        className={
                          styles.detalhes
                        }
                      >
                        {/* =============================
                            STATUS
                            ============================= */}

                        <div
                          className={
                            styles.statusBox
                          }
                        >
                          <div>
                            <span
                              className={
                                styles.label
                              }
                            >
                              Status do pedido
                            </span>

                            <small>
                              {podeAlterarStatus
                                ? 'Atualize o andamento do pedido.'
                                : 'Este pedido não possui mais etapas disponíveis.'}
                            </small>
                          </div>

                          <div
                            className={
                              styles.statusControle
                            }
                          >
                            <div
                              className={`${styles.status} ${
                                styles[
                                  `status-${classeStatus(
                                    pedido.status,
                                  )}` as keyof typeof styles
                                ]
                              }`}
                            >
                              {formatarStatus(
                                pedido.status,
                              )}
                            </div>

                            {podeAlterarStatus ? (
                              <div
                                className={
                                  styles.selectWrapper
                                }
                              >
                                <select
                                  value={
                                    pedido.status
                                  }
                                  disabled={
                                    salvando
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    alterarStatus(
                                      pedido.id,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                >
                                  <option
                                    value={
                                      pedido.status
                                    }
                                  >
                                    {formatarStatus(
                                      pedido.status,
                                    )}
                                  </option>

                                  {statusDisponiveis.map(
                                    (
                                      status,
                                    ) => (
                                      <option
                                        key={
                                          status
                                        }
                                        value={
                                          status
                                        }
                                      >
                                        {formatarStatus(
                                          status,
                                        )}
                                      </option>
                                    ),
                                  )}
                                </select>

                                <ChevronDown
                                  size={16}
                                  aria-hidden="true"
                                />
                              </div>
                            ) : (
                              <div
                                className={
                                  styles.statusAtualizado
                                }
                              >
                                <Check
                                  size={15}
                                />

                                {pedido.status ===
                                'concluido'
                                  ? 'Pedido concluído'
                                  : 'Pedido cancelado'}
                              </div>
                            )}

                            {salvando && (
                              <Loader2
                                size={17}
                                className={
                                  styles.spinner
                                }
                              />
                            )}

                            {atualizado && (
                              <span
                                className={
                                  styles.statusAtualizado
                                }
                              >
                                <Check
                                  size={15}
                                />

                                Atualizado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* =============================
                            ESTOQUE
                            ============================= */}

                        {pedido.status ===
                          'cancelado' && (
                          <div
                            className={
                              styles.estoqueBox
                            }
                          >
                            <div
                              className={
                                styles.estoqueInfo
                              }
                            >
                              <div
                                className={
                                  styles.estoqueTitulo
                                }
                              >
                                <RotateCcw
                                  size={14}
                                />

                                <span>
                                  Estoque do pedido
                                </span>
                              </div>

                              <span
                                className={
                                  styles.estoqueDescricao
                                }
                              >
                                {pedido.estoqueDevolvido
                                  ? 'Os produtos deste pedido já foram devolvidos ao estoque.'
                                  : 'O cancelamento não altera o estoque. Faça a devolução manual quando necessário.'}
                              </span>
                            </div>

                            {pedido.estoqueDevolvido ? (
                              <div
                                className={
                                  styles.estoqueDevolvido
                                }
                              >
                                <Check
                                  size={14}
                                />

                                <span>
                                  Estoque devolvido
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={
                                  styles.devolverEstoque
                                }
                                disabled={
                                  !podeDevolverEstoque ||
                                  salvandoEstoque
                                }
                                onClick={() =>
                                  devolverEstoque(
                                    pedido,
                                  )
                                }
                              >
                                {salvandoEstoque ? (
                                  <>
                                    <Loader2
                                      size={14}
                                      className={
                                        styles.spinner
                                      }
                                    />

                                    <span>
                                      Devolvendo...
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw
                                      size={14}
                                    />

                                    <span>
                                      Devolver produtos ao estoque
                                    </span>
                                  </>
                                )}
                              </button>
                            )}

                            {estoqueAtualizado &&
                              !pedido.estoqueDevolvido && (
                                <span>
                                  Produtos devolvidos ao estoque.
                                </span>
                              )}
                          </div>
                        )}

                        {/* =============================
                            GRID DE INFORMAÇÕES
                            ============================= */}

                        <div
                          className={
                            styles.detalhesGrid
                          }
                        >
                          {/* CLIENTE */}

                          <div
                            className={
                              styles.bloco
                            }
                          >
                            <div
                              className={
                                styles.blocoTitulo
                              }
                            >
                              <User
                                size={17}
                              />

                              <span>
                                Cliente
                              </span>
                            </div>

                            <div
                              className={
                                styles.blocoConteudo
                              }
                            >
                              <strong>
                                {
                                  pedido
                                    .cliente
                                    .nome
                                }
                              </strong>

                              <span>
                                {
                                  pedido
                                    .cliente
                                    .whatsapp
                                }
                              </span>

                              <button
                                type="button"
                                className={
                                  styles.whatsapp
                                }
                                onClick={() =>
                                  abrirWhatsApp(
                                    pedido,
                                  )
                                }
                              >
                                <MessageCircle
                                  size={15}
                                />

                                Chamar no WhatsApp
                              </button>
                            </div>
                          </div>

                          {/* ENTREGA */}

                          <div
                            className={
                              styles.bloco
                            }
                          >
                            <div
                              className={
                                styles.blocoTitulo
                              }
                            >
                              <Package
                                size={17}
                              />

                              <span>
                                Entrega
                              </span>
                            </div>

                            <div
                              className={
                                styles.blocoConteudo
                              }
                            >
                              <strong>
                                {formatarTipoEntrega(
                                  pedido
                                    .entrega
                                    .tipo,
                                )}
                              </strong>

                              {pedido.entrega
                                .rua && (
                                <span>
                                  {
                                    pedido
                                      .entrega
                                      .rua
                                  }

                                  {pedido
                                    .entrega
                                    .numero
                                    ? `, ${pedido.entrega.numero}`
                                    : ''}
                                </span>
                              )}

                              {pedido
                                .entrega
                                .complemento && (
                                <span>
                                  {
                                    pedido
                                      .entrega
                                      .complemento
                                  }
                                </span>
                              )}

                              {pedido
                                .entrega
                                .bairro && (
                                <span>
                                  {
                                    pedido
                                      .entrega
                                      .bairro
                                  }
                                </span>
                              )}

                              {pedido
                                .entrega
                                .cidade && (
                                <span>
                                  {
                                    pedido
                                      .entrega
                                      .cidade
                                  }
                                </span>
                              )}

                              {pedido.entrega
                                .cep && (
                                <span>
                                  CEP:{' '}
                                  {
                                    pedido
                                      .entrega
                                      .cep
                                  }
                                </span>
                              )}

                              {pedido
                                .entrega
                                .referencia && (
                                <span>
                                  Referência:{' '}
                                  {
                                    pedido
                                      .entrega
                                      .referencia
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          {/* PAGAMENTO */}

                          <div
                            className={
                              styles.bloco
                            }
                          >
                            <div
                              className={
                                styles.blocoTitulo
                              }
                            >
                              <ShoppingBag
                                size={17}
                              />

                              <span>
                                Pagamento
                              </span>
                            </div>

                            <div
                              className={
                                styles.blocoConteudo
                              }
                            >
                              <strong>
                                {formatarPagamento(
                                  pedido
                                    .pagamento
                                    .forma,
                                )}
                              </strong>

                              {pedido
                                .pagamento
                                .trocoPara !==
                                null && (
                                <span>
                                  Troco para:{' '}
                                  {formatarPreco(
                                    pedido
                                      .pagamento
                                      .trocoPara,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* VALORES */}

                          <div
                            className={
                              styles.bloco
                            }
                          >
                            <div
                              className={
                                styles.blocoTitulo
                              }
                            >
                              <TrendingUp
                                size={17}
                              />

                              <span>
                                Valores
                              </span>
                            </div>

                            <div
                              className={
                                styles.valores
                              }
                            >
                              <div>
                                <span>
                                  Subtotal
                                </span>

                                <strong>
                                  {formatarPreco(
                                    pedido
                                      .valores
                                      .subtotal,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Frete
                                </span>

                                <strong>
                                  {pedido
                                    .valores
                                    .frete > 0
                                    ? formatarPreco(
                                        pedido
                                          .valores
                                          .frete,
                                      )
                                    : 'A combinar'}
                                </strong>
                              </div>

                              <div
                                className={
                                  styles.valorTotal
                                }
                              >
                                <span>
                                  Total
                                </span>

                                <strong>
                                  {formatarPreco(
                                    pedido
                                      .valores
                                      .total,
                                  )}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* =============================
                            ITENS
                            ============================= */}

                        <div
                          className={
                            styles.itens
                          }
                        >
                          <div
                            className={
                              styles.itensHeader
                            }
                          >
                            <div
                              className={
                                styles.blocoTitulo
                              }
                            >
                              <ShoppingBag
                                size={17}
                              />

                              <span>
                                Itens do pedido
                              </span>
                            </div>

                            <span>
                              {
                                pedido.itens
                                  .length
                              }{' '}
                              {pedido.itens
                                .length ===
                              1
                                ? 'item'
                                : 'itens'}
                            </span>
                          </div>

                          <div
                            className={
                              styles.itensLista
                            }
                          >
                            {pedido.itens
                              .length ===
                            0 ? (
                              <div
                                className={
                                  styles.item
                                }
                              >
                                <div
                                  className={
                                    styles.itemInfo
                                  }
                                >
                                  <strong>
                                    Nenhum item
                                  </strong>

                                  <span>
                                    Este pedido não
                                    possui itens
                                    registrados.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              pedido.itens.map(
                                (
                                  item,
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className={
                                      styles.item
                                    }
                                  >
                                    <div
                                      className={
                                        styles.itemInfo
                                      }
                                    >
                                      <strong>
                                        {
                                          item.nome
                                        }
                                      </strong>

                                      <span>
                                        {
                                          item.quantidade
                                        }{' '}
                                        ×{' '}
                                        {formatarPreco(
                                          item.precoUnitario,
                                        )}
                                      </span>
                                    </div>

                                    <strong>
                                      {formatarPreco(
                                        item.subtotal,
                                      )}
                                    </strong>
                                  </div>
                                ),
                              )
                            )}
                          </div>
                        </div>

                        {/* =============================
                            RODAPÉ
                            ============================= */}

                        <div
                          className={
                            styles.pedidoRodape
                          }
                        >
                          <span>
                            Última atualização:{' '}
                            {formatarData(
                              pedido.atualizadoEm,
                            )}
                          </span>

                          <span>
                            ID:{' '}
                            {pedido.id}
                          </span>
                        </div>
                      </div>
                    )}
                  </article>
                )
              },
            )}
          </section>
        )}
      </div>
    </main>
  )
}
