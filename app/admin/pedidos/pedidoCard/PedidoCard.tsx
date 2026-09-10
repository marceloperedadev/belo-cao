'use client'

import {
  Check,
  ChevronDown,
  Clock3,
  Copy,
  MapPin,
  MessageCircle,
  Package,
  Printer,
  RotateCcw,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'

import { useState } from 'react'

import styles from './PedidoCard.module.css'

/* =========================================================
   BELO CÃO
   PEDIDO CARD
   COMPONENTE INDIVIDUAL
   PREMIUM · CLEAN · EDITORIAL
   ROXO + BRANCO
   ========================================================= */

/* =========================================================
   TIPOS
   ========================================================= */

export type StatusPedido =
  | 'recebido'
  | 'confirmado'
  | 'em_preparo'
  | 'saiu_para_entrega'
  | 'concluido'
  | 'cancelado'

export type ResolucaoEstoque =
  | 'pendente'
  | 'devolvido'
  | 'nao_devolver'

export type ItemPedido = {
  id: string
  nome: string
  quantidade: number
  precoUnitario: number
  subtotal: number
}

export type Pedido = {
  id: string
  numeroPedido: string

  status: StatusPedido

  cliente: {
    nome: string
    telefone: string
  }

  entrega: {
    tipo: 'delivery' | 'pickup'
    endereco?: string
    complemento?: string
    bairro?: string
    cidade?: string
  }

  pagamento: {
    metodo: string
    status?: string
  }

  itens: ItemPedido[]

  subtotal: number
  taxaEntrega: number
  total: number

  resolucaoEstoque: ResolucaoEstoque

  criadoEm: string
  atualizadoEm?: string
}

/* =========================================================
   TIPO DA API
   ========================================================= */

export type ItemPedidoApi = {
  id?: string | number
  produtoId?: string | number
  nome?: string
  produto?: string
  quantidade?: number | string
  precoUnitario?: number | string
  preco?: number | string
  subtotal?: number | string
  total?: number | string
}

export type PedidoApi = {
  id?: string | number
  pedidoId?: string | number

  numeroPedido?: string | number
  numero?: string | number
  order_number?: number | string | null

  status?: string

  cliente?: {
    id?: string | number
    nome?: string
    telefone?: string
    celular?: string
    whatsapp?: string
  }

  nomeCliente?: string
  telefone?: string

  entrega?: {
    tipo?: string
    endereco?: string
    complemento?: string
    bairro?: string
    cidade?: string
    taxa?: number | string
    taxaEntrega?: number | string
  }

  tipoEntrega?: string
  endereco?: string
  complemento?: string
  bairro?: string
  cidade?: string

  pagamento?: {
    metodo?: string
    forma?: string
    status?: string
  }

  metodoPagamento?: string
  formaPagamento?: string

  itens?: ItemPedidoApi[]
  produtos?: ItemPedidoApi[]

  subtotal?: number | string
  taxaEntrega?: number | string
  taxa?: number | string
  total?: number | string
  valorTotal?: number | string

  resolucaoEstoque?: string
  estoqueResolucao?: string

  criadoEm?: string
  createdAt?: string
  dataCriacao?: string

  atualizadoEm?: string
  updatedAt?: string
}

/* =========================================================
   PROPS
   ========================================================= */

type PedidoCardProps = {
  pedido: Pedido

  aberto: boolean

  statusSalvando: string | null
  statusSucesso: string | null

  estoqueSalvando: string | null
  estoqueSucesso: string | null

  onToggle: (pedidoId: string) => void

  onStatusChange: (
    pedidoId: string,
    status: StatusPedido,
  ) => void

  onResolverEstoque: (
    pedidoId: string,
    acao: 'devolver' | 'nao_devolver',
  ) => void

  onWhatsApp: (pedido: Pedido) => void
}

/* =========================================================
   FLUXO DE STATUS
   ========================================================= */

const PROXIMOS_STATUS: Record<
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

function formatarPreco(valor: number) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  ).format(valor)
}

function formatarData(valor: string) {
  if (!valor) {
    return '—'
  }

  const data = new Date(valor)

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(data)
}

function nomeStatus(
  status: StatusPedido,
) {
  const labels: Record<
    StatusPedido,
    string
  > = {
    recebido: 'Recebido',
    confirmado: 'Confirmado',
    em_preparo: 'Em preparo',
    saiu_para_entrega:
      'Saiu para entrega',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  }

  return labels[status]
}

function nomePagamento(
  metodo: string,
) {
  const normalizado = metodo
    .toLowerCase()
    .trim()

  if (normalizado === 'pix') {
    return 'PIX'
  }

  if (
    normalizado === 'cash' ||
    normalizado === 'dinheiro'
  ) {
    return 'Dinheiro'
  }

  if (
    normalizado === 'card' ||
    normalizado === 'cartao' ||
    normalizado === 'cartão'
  ) {
    return 'Cartão'
  }

  if (
    normalizado === 'credito' ||
    normalizado === 'crédito'
  ) {
    return 'Cartão de crédito'
  }

  if (
    normalizado === 'debito' ||
    normalizado === 'débito'
  ) {
    return 'Cartão de débito'
  }

  return metodo || 'Não informado'
}

function nomeEntrega(
  tipo:
    | 'delivery'
    | 'pickup',
) {
  return tipo === 'pickup'
    ? 'Retirada no local'
    : 'Entrega'
}

/* =========================================================
   STATUS PERMITIDOS
   ========================================================= */

function statusPermitidos(
  statusAtual: StatusPedido,
) {
  return [
    statusAtual,
    ...PROXIMOS_STATUS[statusAtual],
  ]
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export function PedidoCard({
  pedido,
  aberto,
  statusSalvando,
  statusSucesso,
  estoqueSalvando,
  estoqueSucesso,
  onToggle,
  onStatusChange,
  onResolverEstoque,
  onWhatsApp,
}: PedidoCardProps) {
  const [copiado, setCopiado] =
    useState(false)

  const precisaAtencao =
    pedido.status === 'cancelado' &&
    pedido.resolucaoEstoque ===
      'pendente'

  const estoqueResolvido =
    pedido.status === 'cancelado' &&
    pedido.resolucaoEstoque !==
      'pendente'

  const podeAlterarStatus =
    pedido.status !== 'concluido' &&
    pedido.status !== 'cancelado'

  const statusesDisponiveis =
    statusPermitidos(
      pedido.status,
    )

  /* =======================================================
     NOVA FUNÇÃO — COPIAR PEDIDO
     ======================================================= */

  const copiarPedido = async () => {
    const endereco = [
      pedido.entrega.endereco,
      pedido.entrega.complemento,
      pedido.entrega.bairro,
      pedido.entrega.cidade,
    ]
      .filter(Boolean)
      .join(', ')

    const itens = pedido.itens
      .map(
        (item) =>
          `${item.quantidade}x ${item.nome} — ${formatarPreco(item.subtotal)}`,
      )
      .join('\n')

    const resumo = [
      `Pedido ${pedido.numeroPedido}`,
      `Cliente: ${pedido.cliente.nome}`,
      `Telefone: ${pedido.cliente.telefone || 'Não informado'}`,
      `Entrega: ${nomeEntrega(pedido.entrega.tipo)}`,
      endereco
        ? `Endereço: ${endereco}`
        : '',
      `Pagamento: ${nomePagamento(pedido.pagamento.metodo)}`,
      '',
      'Produtos:',
      itens || 'Nenhum produto informado',
      '',
      `Subtotal: ${formatarPreco(pedido.subtotal)}`,
      pedido.taxaEntrega > 0
        ? `Entrega: ${formatarPreco(pedido.taxaEntrega)}`
        : '',
      `Total: ${formatarPreco(pedido.total)}`,
      `Status: ${nomeStatus(pedido.status)}`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(
        resumo,
      )

      setCopiado(true)

      window.setTimeout(() => {
        setCopiado(false)
      }, 1800)
    } catch (error) {
      console.error(
        'Não foi possível copiar o pedido:',
        error,
      )
    }
  }

  /* =======================================================
     NOVA FUNÇÃO — IMPRIMIR PEDIDO
     IMPRIME SOMENTE ESTE PEDIDO
     ======================================================= */

  const imprimirPedido = () => {
    const endereco = [
      pedido.entrega.endereco,
      pedido.entrega.complemento,
      pedido.entrega.bairro,
      pedido.entrega.cidade,
    ]
      .filter(Boolean)
      .join(', ')

    const itensHtml =
      pedido.itens.length > 0
        ? pedido.itens
            .map(
              (item) => `
                <tr>
                  <td>${item.nome}</td>
                  <td>${item.quantidade} × ${formatarPreco(item.precoUnitario)}</td>
                  <td>${formatarPreco(item.subtotal)}</td>
                </tr>
              `,
            )
            .join('')
        : `
            <tr>
              <td colspan="3">Nenhum produto informado</td>
            </tr>
          `

    const janela = window.open(
      '',
      '_blank',
      'width=850,height=700',
    )

    if (!janela) {
      return
    }

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Pedido ${pedido.numeroPedido}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              background: #ffffff;
              color: #2d2433;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            .pagina {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
            }

            .cabecalho {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              padding-bottom: 20px;
              border-bottom: 2px solid #672f96;
            }

            .marca {
              color: #672f96;
              font-size: 22px;
              font-weight: 800;
              letter-spacing: -0.03em;
            }

            .numero {
              margin-top: 5px;
              color: #8c8192;
              font-size: 12px;
            }

            .data {
              color: #665b6d;
              font-size: 11px;
              text-align: right;
            }

            .secao {
              margin-top: 24px;
            }

            .titulo {
              margin: 0 0 10px;
              color: #672f96;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }

            .box {
              padding: 14px;
              border: 1px solid #e9e4ec;
              border-radius: 10px;
            }

            .linha {
              margin: 4px 0;
              font-size: 12px;
              line-height: 1.5;
            }

            .linha strong {
              font-weight: 800;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th,
            td {
              padding: 11px 8px;
              border-bottom: 1px solid #eee9f0;
              font-size: 11px;
              text-align: left;
            }

            th {
              color: #672f96;
              font-weight: 800;
            }

            td:last-child,
            th:last-child {
              text-align: right;
            }

            .valores {
              margin-top: 18px;
              margin-left: auto;
              width: 280px;
            }

            .valor {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              padding: 5px 0;
              font-size: 11px;
            }

            .total {
              margin-top: 7px;
              padding-top: 10px;
              border-top: 1px solid #e9e4ec;
              color: #672f96;
              font-size: 15px;
              font-weight: 800;
            }

            .rodape {
              margin-top: 32px;
              padding-top: 14px;
              border-top: 1px solid #e9e4ec;
              color: #8c8192;
              font-size: 10px;
              text-align: center;
            }

            @media print {
              body {
                padding: 0;
              }

              .pagina {
                max-width: none;
              }
            }
          </style>
        </head>

        <body>
          <main class="pagina">

            <header class="cabecalho">
              <div>
                <div class="marca">
                  BELO CÃO
                </div>

                <div class="numero">
                  Pedido ${pedido.numeroPedido}
                </div>
              </div>

              <div class="data">
                ${formatarData(pedido.criadoEm)}
              </div>
            </header>

            <section class="secao">
              <h2 class="titulo">
                Cliente
              </h2>

              <div class="box">
                <div class="linha">
                  <strong>Nome:</strong>
                  ${pedido.cliente.nome}
                </div>

                <div class="linha">
                  <strong>Telefone:</strong>
                  ${pedido.cliente.telefone || 'Não informado'}
                </div>
              </div>
            </section>

            <section class="secao">
              <h2 class="titulo">
                Entrega
              </h2>

              <div class="box">
                <div class="linha">
                  <strong>Tipo:</strong>
                  ${nomeEntrega(pedido.entrega.tipo)}
                </div>

                ${
                  endereco
                    ? `
                      <div class="linha">
                        <strong>Endereço:</strong>
                        ${endereco}
                      </div>
                    `
                    : ''
                }
              </div>
            </section>

            <section class="secao">
              <h2 class="titulo">
                Pagamento
              </h2>

              <div class="box">
                <div class="linha">
                  <strong>Forma:</strong>
                  ${nomePagamento(pedido.pagamento.metodo)}
                </div>

                ${
                  pedido.pagamento.status
                    ? `
                      <div class="linha">
                        <strong>Status:</strong>
                        ${pedido.pagamento.status}
                      </div>
                    `
                    : ''
                }
              </div>
            </section>

            <section class="secao">
              <h2 class="titulo">
                Produtos
              </h2>

              <div class="box">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itensHtml}
                  </tbody>
                </table>

                <div class="valores">
                  <div class="valor">
                    <span>Subtotal</span>
                    <strong>
                      ${formatarPreco(pedido.subtotal)}
                    </strong>
                  </div>

                  ${
                    pedido.taxaEntrega > 0
                      ? `
                        <div class="valor">
                          <span>Entrega</span>
                          <strong>
                            ${formatarPreco(pedido.taxaEntrega)}
                          </strong>
                        </div>
                      `
                      : ''
                  }

                  <div class="valor total">
                    <span>Total</span>
                    <strong>
                      ${formatarPreco(pedido.total)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section class="secao">
              <h2 class="titulo">
                Status
              </h2>

              <div class="box">
                <div class="linha">
                  <strong>
                    ${nomeStatus(pedido.status)}
                  </strong>
                </div>
              </div>
            </section>

            <footer class="rodape">
              Pedido ${pedido.numeroPedido}
              ·
              Criado em ${formatarData(pedido.criadoEm)}
              ${
                pedido.atualizadoEm
                  ? ` · Atualizado em ${formatarData(pedido.atualizadoEm)}`
                  : ''
              }
            </footer>

          </main>
        </body>
      </html>
    `)

    janela.document.close()

    janela.focus()

    janela.setTimeout(() => {
      janela.print()
      janela.close()
    }, 250)
  }

  return (
    <article
      className={[
        styles.pedido,
        aberto
          ? styles.pedidoAberto
          : '',
        precisaAtencao
          ? styles.pedidoPrecisaAtencao
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* =====================================================
          RESUMO
          ===================================================== */}

      <button
        type="button"
        className={styles.pedidoResumo}
        onClick={() =>
          onToggle(pedido.id)
        }
        aria-expanded={aberto}
      >
        <div
          className={
            styles.pedidoIdentificacao
          }
        >
          <div
            className={
              styles.pedidoNumero
            }
          >
            <strong>
              {pedido.numeroPedido}
            </strong>

            <span>
              {formatarData(
                pedido.criadoEm,
              )}
            </span>
          </div>

          <div
            className={styles.cliente}
          >
            <span
              className={
                styles.clienteIcone
              }
            >
              <User
                size={15}
                strokeWidth={2}
              />
            </span>

            <div>
              <strong>
                {pedido.cliente.nome}
              </strong>

              <span>
                {nomeEntrega(
                  pedido.entrega.tipo,
                )}
              </span>
            </div>
          </div>
        </div>

        <div
          className={
            styles.pedidoResumoCentro
          }
        >
          <span
            className={[
              styles.status,
              styles[
                `status-${pedido.status}`
              ],
            ].join(' ')}
          >
            {pedido.status ===
              'recebido' && (
              <Clock3 size={14} />
            )}

            {pedido.status ===
              'confirmado' && (
              <Check size={14} />
            )}

            {pedido.status ===
              'em_preparo' && (
              <Package size={14} />
            )}

            {pedido.status ===
              'saiu_para_entrega' && (
              <ShoppingBag
                size={14}
              />
            )}

            {pedido.status ===
              'concluido' && (
              <Check size={14} />
            )}

            {pedido.status ===
              'cancelado' && (
              <X size={14} />
            )}

            {nomeStatus(
              pedido.status,
            )}
          </span>

          {precisaAtencao && (
            <span
              className={
                styles.pedidoAlerta
              }
            >
              <X size={13} />
              Estoque pendente
            </span>
          )}

          {estoqueResolvido && (
            <span
              className={
                styles.estoqueResolvido
              }
            >
              <Check size={13} />
              Estoque resolvido
            </span>
          )}
        </div>

        <div
          className={styles.total}
        >
          <strong>
            {formatarPreco(
              pedido.total,
            )}
          </strong>

          <span>
            {pedido.itens.length}{' '}
            {pedido.itens.length === 1
              ? 'item'
              : 'itens'}
          </span>
        </div>

        <span
          className={
            styles.pedidoChevron
          }
        >
          <ChevronDown
            size={20}
            strokeWidth={1.8}
          />
        </span>
      </button>

      {/* =====================================================
          DETALHES
          ===================================================== */}

      {aberto && (
        <div
          className={styles.detalhes}
        >
          {/* =================================================
              STATUS
              ================================================= */}

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

              <strong>
                {podeAlterarStatus
                  ? 'Atualize o andamento do pedido'
                  : pedido.status ===
                      'concluido'
                    ? 'Pedido concluído'
                    : 'Pedido cancelado'}
              </strong>
            </div>

            <div
              className={
                styles.statusControle
              }
            >
              <div
                className={
                  styles.selectWrapper
                }
              >
                <select
                  value={
                    pedido.status
                  }
                  onChange={(event) =>
                    onStatusChange(
                      pedido.id,
                      event.target
                        .value as StatusPedido,
                    )
                  }
                  disabled={
                    statusSalvando ===
                      pedido.id ||
                    !podeAlterarStatus
                  }
                >
                  {statusesDisponiveis.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {nomeStatus(
                          status,
                        )}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={16}
                />
              </div>

              {statusSalvando ===
                pedido.id && (
                <span
                  className={
                    styles.statusMensagem
                  }
                >
                  Salvando...
                </span>
              )}

              {statusSucesso ===
                pedido.id && (
                <span
                  className={
                    styles.statusMensagem
                  }
                >
                  <Check size={14} />
                  Atualizado
                </span>
              )}
            </div>
          </div>

          {/* =================================================
              ESTOQUE
              ================================================= */}

          {pedido.status ===
            'cancelado' && (
            <div
              className={[
                styles.estoqueBox,
                pedido.resolucaoEstoque ===
                'pendente'
                  ? styles.estoquePendente
                  : styles.estoqueResolvidoBox,
              ].join(' ')}
            >
              <div
                className={
                  styles.estoqueInfo
                }
              >
                <span
                  className={
                    styles.estoqueIcone
                  }
                >
                  {pedido.resolucaoEstoque ===
                  'pendente' ? (
                    <RotateCcw
                      size={19}
                    />
                  ) : (
                    <Check size={19} />
                  )}
                </span>

                <div>
                  <strong>
                    {pedido.resolucaoEstoque ===
                    'pendente'
                      ? 'Resolver estoque'
                      : 'Estoque resolvido'}
                  </strong>

                  <p>
                    {pedido.resolucaoEstoque ===
                    'pendente'
                      ? 'Defina o que deve acontecer com os itens reservados deste pedido.'
                      : pedido.resolucaoEstoque ===
                          'devolvido'
                        ? 'Os itens deste pedido foram devolvidos ao estoque.'
                        : 'Os itens deste pedido não serão devolvidos ao estoque.'}
                  </p>
                </div>
              </div>

              {pedido.resolucaoEstoque ===
                'pendente' && (
                <div
                  className={
                    styles.estoqueAcoes
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.devolverEstoque
                    }
                    onClick={() =>
                      onResolverEstoque(
                        pedido.id,
                        'devolver',
                      )
                    }
                    disabled={
                      estoqueSalvando ===
                      pedido.id
                    }
                  >
                    <RotateCcw
                      size={16}
                    />

                    Devolver ao estoque
                  </button>

                  <button
                    type="button"
                    className={
                      styles.naoDevolverEstoque
                    }
                    onClick={() =>
                      onResolverEstoque(
                        pedido.id,
                        'nao_devolver',
                      )
                    }
                    disabled={
                      estoqueSalvando ===
                      pedido.id
                    }
                  >
                    <X size={16} />

                    Não devolver
                  </button>
                </div>
              )}

              {estoqueSalvando ===
                pedido.id && (
                <span
                  className={
                    styles.statusMensagem
                  }
                >
                  Salvando...
                </span>
              )}

              {estoqueSucesso ===
                pedido.id && (
                <span
                  className={
                    styles.statusMensagem
                  }
                >
                  <Check size={14} />
                  Estoque atualizado
                </span>
              )}
            </div>
          )}

          {/* =================================================
              INFORMAÇÕES
              ================================================= */}

          <div
            className={
              styles.detalhesGrid
            }
          >
            <section
              className={styles.bloco}
            >
              <div
                className={
                  styles.blocoTitulo
                }
              >
                <User size={17} />

                <h3>Cliente</h3>
              </div>

              <div
                className={
                  styles.blocoConteudo
                }
              >
                <strong>
                  {pedido.cliente.nome}
                </strong>

                <span>
                  {pedido.cliente.telefone ||
                    'Telefone não informado'}
                </span>

                {pedido.cliente
                  .telefone && (
                  <button
                    type="button"
                    className={
                      styles.whatsapp
                    }
                    onClick={() =>
                      onWhatsApp(
                        pedido,
                      )
                    }
                  >
                    <MessageCircle
                      size={16}
                    />

                    Chamar no WhatsApp
                  </button>
                )}
              </div>
            </section>

            <section
              className={styles.bloco}
            >
              <div
                className={
                  styles.blocoTitulo
                }
              >
                <MapPin size={17} />

                <h3>Entrega</h3>
              </div>

              <div
                className={
                  styles.blocoConteudo
                }
              >
                <strong>
                  {nomeEntrega(
                    pedido.entrega.tipo,
                  )}
                </strong>

                {pedido.entrega.tipo ===
                  'delivery' && (
                  <>
                    {pedido.entrega
                      .endereco && (
                      <span>
                        {
                          pedido.entrega
                            .endereco
                        }
                      </span>
                    )}

                    {pedido.entrega
                      .complemento && (
                      <span>
                        {
                          pedido.entrega
                            .complemento
                        }
                      </span>
                    )}

                    {pedido.entrega
                      .bairro && (
                      <span>
                        {
                          pedido.entrega
                            .bairro
                        }
                      </span>
                    )}

                    {pedido.entrega
                      .cidade && (
                      <span>
                        {
                          pedido.entrega
                            .cidade
                        }
                      </span>
                    )}
                  </>
                )}
              </div>
            </section>

            <section
              className={styles.bloco}
            >
              <div
                className={
                  styles.blocoTitulo
                }
              >
                <ShoppingBag
                  size={17}
                />

                <h3>Pagamento</h3>
              </div>

              <div
                className={
                  styles.blocoConteudo
                }
              >
                <strong>
                  {nomePagamento(
                    pedido.pagamento
                      .metodo,
                  )}
                </strong>

                {pedido.pagamento
                  .status && (
                  <span>
                    {
                      pedido.pagamento
                        .status
                    }
                  </span>
                )}
              </div>
            </section>

            <section
              className={styles.bloco}
            >
              <div
                className={
                  styles.blocoTitulo
                }
              >
                <Package size={17} />

                <h3>Valores</h3>
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
                      pedido.subtotal,
                    )}
                  </strong>
                </div>

                {pedido.taxaEntrega >
                  0 && (
                  <div>
                    <span>
                      Entrega
                    </span>

                    <strong>
                      {formatarPreco(
                        pedido.taxaEntrega,
                      )}
                    </strong>
                  </div>
                )}

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
                      pedido.total,
                    )}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          {/* =================================================
              PRODUTOS
              ================================================= */}

          <section
            className={styles.itens}
          >
            <div
              className={
                styles.itensHeader
              }
            >
              <strong>
                Itens do pedido
              </strong>

              <span>
                {pedido.itens.length}{' '}
                {pedido.itens.length === 1
                  ? 'produto'
                  : 'produtos'}
              </span>
            </div>

            <div
              className={
                styles.itensLista
              }
            >
              {pedido.itens.map(
                (item) => (
                  <div
                    key={item.id}
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
                        {item.nome}
                      </strong>

                      <span>
                        {item.quantidade}{' '}
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
              )}
            </div>
          </section>

          {/* =================================================
              RODAPÉ
              ================================================= */}

          <footer
            className={
              styles.pedidoRodape
            }
          >
            <span>
              Criado em{' '}
              {formatarData(
                pedido.criadoEm,
              )}
            </span>

            {pedido.atualizadoEm && (
              <span>
                Atualizado em{' '}
                {formatarData(
                  pedido.atualizadoEm,
                )}
              </span>
            )}

            {/* =================================================
                NOVAS AÇÕES
                ================================================= */}

            <div
              className={
                styles.acoesPedido
              }
            >
              <button
                type="button"
                className={
                  styles.acaoPedido
                }
                onClick={copiarPedido}
                title="Copiar pedido"
              >
                {copiado ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}

                {copiado
                  ? 'Pedido copiado'
                  : 'Copiar pedido'}
              </button>

              <button
                type="button"
                className={
                  styles.acaoPedido
                }
                onClick={imprimirPedido}
                title="Imprimir pedido"
              >
                <Printer size={14} />

                Imprimir pedido
              </button>
            </div>
          </footer>
        </div>
      )}
    </article>
  )
}

export default PedidoCard