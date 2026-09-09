'use client'

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit3,
  Loader2,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import styles from './Clientes.module.css'

/* =========================================================
   TIPOS
   ========================================================= */

type Cliente = {
  id: string
  name: string
  whatsapp: string

  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  reference_point: string

  created_at?: string
  updated_at?: string

  total_orders: number
  total_spent: number
  last_order_at: string | null
}

type Metricas = {
  total_clientes: number
  clientes_com_pedidos: number
  clientes_sem_pedidos: number
  novos_mes: number
  total_vendido: number
  total_pedidos: number
}

type FormCliente = {
  name: string
  whatsapp: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  reference_point: string
}

/* =========================================================
   CONSTANTES
   ========================================================= */

const FORM_INICIAL: FormCliente = {
  name: '',
  whatsapp: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  reference_point: '',
}

const METRICAS_INICIAIS: Metricas = {
  total_clientes: 0,
  clientes_com_pedidos: 0,
  clientes_sem_pedidos: 0,
  novos_mes: 0,
  total_vendido: 0,
  total_pedidos: 0,
}

/* =========================================================
   HELPERS
   ========================================================= */

function numeroSeguro(valor: unknown) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function formatarPreco(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeroSeguro(valor))
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return 'Nenhum pedido'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data)
}

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) return '—'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data)
}

function normalizarWhatsapp(valor: string) {
  return valor.replace(/\D/g, '')
}

function formatarWhatsapp(valor: string) {
  const numeros = normalizarWhatsapp(valor)

  let numero = numeros

  if (numero.startsWith('55')) {
    numero = numero.slice(2)
  }

  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(
      2,
      7,
    )}-${numero.slice(7)}`
  }

  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(
      2,
      6,
    )}-${numero.slice(6)}`
  }

  return valor || '—'
}

function formatarCep(valor: string) {
  const numeros = valor.replace(/\D/g, '')

  if (numeros.length === 8) {
    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
  }

  return valor
}

function normalizarCliente(
  cliente: Partial<Cliente> & {
    id?: string | number | null
  },
): Cliente | null {
  if (!cliente.id) {
    return null
  }

  return {
    id: String(cliente.id),
    name: String(cliente.name ?? '').trim(),
    whatsapp: String(cliente.whatsapp ?? '').trim(),

    cep: String(cliente.cep ?? '').trim(),
    street: String(cliente.street ?? '').trim(),
    number: String(cliente.number ?? '').trim(),
    complement: String(cliente.complement ?? '').trim(),
    neighborhood: String(
      cliente.neighborhood ?? '',
    ).trim(),
    city: String(cliente.city ?? '').trim(),
    reference_point: String(
      cliente.reference_point ?? '',
    ).trim(),

    created_at: cliente.created_at,
    updated_at: cliente.updated_at,

    total_orders: numeroSeguro(
      cliente.total_orders,
    ),
    total_spent: numeroSeguro(
      cliente.total_spent,
    ),
    last_order_at:
      cliente.last_order_at ?? null,
  }
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [metricas, setMetricas] =
    useState<Metricas>(METRICAS_INICIAIS)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] =
    useState('todos')

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modalAberto, setModalAberto] =
    useState(false)

  const [clienteSelecionado, setClienteSelecionado] =
    useState<Cliente | null>(null)

  const [formulario, setFormulario] =
    useState<FormCliente>({
      ...FORM_INICIAL,
    })

  const [salvando, setSalvando] = useState(false)

  const [clienteExcluindo, setClienteExcluindo] =
    useState<string | null>(null)

  const [menuAberto, setMenuAberto] =
    useState<string | null>(null)

  const [toast, setToast] = useState<{
    tipo: 'sucesso' | 'erro'
    mensagem: string
  } | null>(null)

  /* =======================================================
     TOAST
     ======================================================= */

  const mostrarToast = useCallback(
    (
      tipo: 'sucesso' | 'erro',
      mensagem: string,
    ) => {
      setToast({
        tipo,
        mensagem,
      })

      window.setTimeout(() => {
        setToast(null)
      }, 3500)
    },
    [],
  )

  /* =======================================================
     CARREGAR
     ======================================================= */

  const carregarClientes = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) {
          setCarregando(true)
        }

        setErro('')

        const params = new URLSearchParams()

        if (busca.trim()) {
          params.set('busca', busca.trim())
        }

        if (filtroStatus !== 'todos') {
          params.set(
            'status',
            filtroStatus,
          )
        }

        const resposta = await fetch(
          `/api/admin/clientes?${params.toString()}`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        const dados = await resposta.json()

        if (!resposta.ok || !dados?.sucesso) {
          throw new Error(
            dados?.erro ||
              'Não foi possível carregar os clientes.',
          )
        }

        const lista = Array.isArray(dados.clientes)
          ? dados.clientes
              .map(normalizarCliente)
              .filter(
                (
                  cliente: Cliente | null,
                ): cliente is Cliente =>
                  cliente !== null,
              )
          : []

        setClientes(lista)

        setMetricas({
          total_clientes: numeroSeguro(
            dados?.metricas?.total_clientes,
          ),
          clientes_com_pedidos: numeroSeguro(
            dados?.metricas?.clientes_com_pedidos,
          ),
          clientes_sem_pedidos: numeroSeguro(
            dados?.metricas?.clientes_sem_pedidos,
          ),
          novos_mes: numeroSeguro(
            dados?.metricas?.novos_mes,
          ),
          total_vendido: numeroSeguro(
            dados?.metricas?.total_vendido,
          ),
          total_pedidos: numeroSeguro(
            dados?.metricas?.total_pedidos,
          ),
        })
      } catch (error) {
        console.error(error)

        const mensagem =
          error instanceof Error
            ? error.message
            : 'Erro ao carregar clientes.'

        setErro(mensagem)

        if (!silencioso) {
          mostrarToast('erro', mensagem)
        }
      } finally {
        if (!silencioso) {
          setCarregando(false)
        }
      }
    },
    [
      busca,
      filtroStatus,
      mostrarToast,
    ],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      carregarClientes()
    }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [carregarClientes])

  /* =======================================================
     FORM
     ======================================================= */

  function atualizarCampo(
    campo: keyof FormCliente,
    valor: string,
  ) {
    let novoValor = valor

    if (campo === 'whatsapp') {
      novoValor = valor
        .replace(/\D/g, '')
        .slice(0, 13)
    }

    if (campo === 'cep') {
      novoValor = valor
        .replace(/\D/g, '')
        .slice(0, 8)
    }

    setFormulario((anterior) => ({
      ...anterior,
      [campo]: novoValor,
    }))
  }

  function abrirNovoCliente() {
    setClienteSelecionado(null)
    setFormulario({
      ...FORM_INICIAL,
    })
    setModalAberto(true)
    setMenuAberto(null)
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteSelecionado(cliente)

    setFormulario({
      name: cliente.name,
      whatsapp: normalizarWhatsapp(
        cliente.whatsapp,
      ),
      cep: cliente.cep,
      street: cliente.street,
      number: cliente.number,
      complement: cliente.complement,
      neighborhood: cliente.neighborhood,
      city: cliente.city,
      reference_point:
        cliente.reference_point,
    })

    setModalAberto(true)
    setMenuAberto(null)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setClienteSelecionado(null)
    setFormulario({
      ...FORM_INICIAL,
    })
  }

  /* =======================================================
     SALVAR
     ======================================================= */

  async function salvarCliente(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()

    const nome = formulario.name.trim()
    const whatsapp = normalizarWhatsapp(
      formulario.whatsapp,
    )

    if (!nome) {
      mostrarToast(
        'erro',
        'Informe o nome do cliente.',
      )
      return
    }

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      mostrarToast(
        'erro',
        'Informe um WhatsApp válido.',
      )
      return
    }

    try {
      setSalvando(true)

      const resposta = await fetch(
        '/api/admin/clientes',
        {
          method: clienteSelecionado
            ? 'PATCH'
            : 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            ...(clienteSelecionado
              ? {
                  id: clienteSelecionado.id,
                }
              : {}),

            name: nome,
            whatsapp,

            cep:
              formulario.cep.trim() ||
              null,

            street:
              formulario.street.trim() ||
              null,

            number:
              formulario.number.trim() ||
              null,

            complement:
              formulario.complement.trim() ||
              null,

            neighborhood:
              formulario.neighborhood.trim() ||
              null,

            city:
              formulario.city.trim() ||
              null,

            reference_point:
              formulario.reference_point.trim() ||
              null,
          }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.erro ||
            'Não foi possível salvar o cliente.',
        )
      }

      const cliente = normalizarCliente(
        dados.cliente,
      )

      if (cliente) {
        setClientes((anteriores) => {
          const existe = anteriores.some(
            (item) =>
              item.id === cliente.id,
          )

          if (existe) {
            return anteriores.map((item) =>
              item.id === cliente.id
                ? cliente
                : item,
            )
          }

          return [cliente, ...anteriores]
        })
      }

      fecharModal()

      await carregarClientes(true)

      mostrarToast(
        'sucesso',
        clienteSelecionado
          ? 'Cliente atualizado com sucesso.'
          : 'Cliente cadastrado com sucesso.',
      )
    } catch (error) {
      console.error(error)

      mostrarToast(
        'erro',
        error instanceof Error
          ? error.message
          : 'Erro ao salvar cliente.',
      )
    } finally {
      setSalvando(false)
    }
  }

  /* =======================================================
     EXCLUIR
     ======================================================= */

  async function excluirCliente(
    cliente: Cliente,
  ) {
    setMenuAberto(null)

    const confirmado = window.confirm(
      `Excluir o cliente "${cliente.name}"?`,
    )

    if (!confirmado) return

    try {
      setClienteExcluindo(cliente.id)

      const resposta = await fetch(
        `/api/admin/clientes?id=${encodeURIComponent(
          cliente.id,
        )}`,
        {
          method: 'DELETE',
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok || !dados?.sucesso) {
        throw new Error(
          dados?.erro ||
            'Não foi possível excluir o cliente.',
        )
      }

      setClientes((anteriores) =>
        anteriores.filter(
          (item) =>
            item.id !== cliente.id,
        ),
      )

      await carregarClientes(true)

      mostrarToast(
        'sucesso',
        'Cliente excluído com sucesso.',
      )
    } catch (error) {
      console.error(error)

      mostrarToast(
        'erro',
        error instanceof Error
          ? error.message
          : 'Erro ao excluir cliente.',
      )
    } finally {
      setClienteExcluindo(null)
    }
  }

  /* =======================================================
     MÉTRICAS VISÍVEIS
     ======================================================= */

  const clientesComPedidos = useMemo(
    () =>
      clientes.filter(
        (cliente) =>
          cliente.total_orders > 0,
      ).length,
    [clientes],
  )

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className={styles.page}>
      {/* ===================================================
          HEADER
          =================================================== */}

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => {
              window.location.href =
                '/admin'
            }}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className={styles.eyebrow}>
              BELO CÃO
            </div>

            <h1>Clientes</h1>

            <p>
              Gerencie clientes, contatos e
              histórico de compras.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() =>
              carregarClientes()
            }
            disabled={carregando}
          >
            <RefreshCw
              size={17}
              className={
                carregando
                  ? styles.spin
                  : ''
              }
            />

            Atualizar
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={abrirNovoCliente}
          >
            <Plus size={18} />
            Novo cliente
          </button>
        </div>
      </header>

      {/* ===================================================
          MÉTRICAS
          =================================================== */}

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.metricPurple}`}
          >
            <Users size={19} />
          </div>

          <div>
            <span>Total de clientes</span>
            <strong>
              {metricas.total_clientes}
            </strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.metricGreen}`}
          >
            <UserRound size={19} />
          </div>

          <div>
            <span>Com pedidos</span>
            <strong>
              {metricas.clientes_com_pedidos}
            </strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.metricBlue}`}
          >
            <ShoppingBag size={19} />
          </div>

          <div>
            <span>Pedidos realizados</span>
            <strong>
              {metricas.total_pedidos}
            </strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.metricOrange}`}
          >
            <TrendingUp size={19} />
          </div>

          <div>
            <span>Total vendido</span>
            <strong>
              {formatarPreco(
                metricas.total_vendido,
              )}
            </strong>
          </div>
        </article>
      </section>

      {/* ===================================================
          TOOLBAR
          =================================================== */}

      <section className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />

          <input
            type="search"
            value={busca}
            onChange={(evento) =>
              setBusca(
                evento.target.value,
              )
            }
            placeholder="Buscar por nome ou WhatsApp..."
            aria-label="Buscar clientes"
          />

          {busca && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() =>
                setBusca('')
              }
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <button
            type="button"
            className={
              filtroStatus === 'todos'
                ? styles.filterActive
                : styles.filter
            }
            onClick={() =>
              setFiltroStatus('todos')
            }
          >
            Todos
          </button>

          <button
            type="button"
            className={
              filtroStatus === 'ativos'
                ? styles.filterActive
                : styles.filter
            }
            onClick={() =>
              setFiltroStatus('ativos')
            }
          >
            Com pedidos
          </button>

          <button
            type="button"
            className={
              filtroStatus ===
              'sem_pedidos'
                ? styles.filterActive
                : styles.filter
            }
            onClick={() =>
              setFiltroStatus(
                'sem_pedidos',
              )
            }
          >
            Sem pedidos
          </button>
        </div>
      </section>

      {/* ===================================================
          ERRO
          =================================================== */}

      {erro && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={18} />

          <span>{erro}</span>

          <button
            type="button"
            onClick={() =>
              carregarClientes()
            }
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ===================================================
          RESUMO
          =================================================== */}

      <div className={styles.resultsHeader}>
        <div>
          <strong>
            {carregando
              ? 'Carregando...'
              : `${clientes.length} ${
                  clientes.length === 1
                    ? 'resultado'
                    : 'resultados'
                }`}
          </strong>

          {busca && (
            <span>
              Busca por “{busca}”
            </span>
          )}
        </div>

        <span className={styles.resultsHint}>
          {clientesComPedidos} com histórico
          de compras
        </span>
      </div>

      {/* ===================================================
          LISTAGEM
          =================================================== */}

      <section className={styles.list}>
        {carregando ? (
          <div className={styles.loading}>
            <Loader2
              size={28}
              className={styles.spin}
            />

            <span>
              Carregando clientes...
            </span>
          </div>
        ) : clientes.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Users size={28} />
            </div>

            <h2>
              Nenhum cliente encontrado
            </h2>

            <p>
              {busca
                ? 'Tente buscar por outro nome ou WhatsApp.'
                : 'Cadastre o primeiro cliente para começar.'}
            </p>

            {!busca && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={
                  abrirNovoCliente
                }
              >
                <Plus size={18} />
                Novo cliente
              </button>
            )}
          </div>
        ) : (
          clientes.map((cliente) => (
            <article
              key={cliente.id}
              className={styles.clientCard}
            >
              <div className={styles.clientMain}>
                <div className={styles.avatar}>
                  {cliente.name
                    .charAt(0)
                    .toUpperCase() || '?'}
                </div>

                <div className={styles.clientInfo}>
                  <div className={styles.clientNameRow}>
                    <h2>
                      {cliente.name ||
                        'Cliente sem nome'}
                    </h2>

                    {cliente.total_orders >
                      0 ? (
                      <span
                        className={
                          styles.statusActive
                        }
                      >
                        <Check size={13} />
                        Cliente ativo
                      </span>
                    ) : (
                      <span
                        className={
                          styles.statusNeutral
                        }
                      >
                        Sem pedidos
                      </span>
                    )}
                  </div>

                  <div className={styles.contact}>
                    <span>
                      <Phone size={15} />
                      {formatarWhatsapp(
                        cliente.whatsapp,
                      )}
                    </span>

                    {cliente.city && (
                      <span>
                        <MapPin size={15} />
                        {cliente.city}
                      </span>
                    )}
                  </div>

                  {cliente.street && (
                    <p className={styles.address}>
                      {cliente.street}

                      {cliente.number
                        ? `, ${cliente.number}`
                        : ''}

                      {cliente.neighborhood
                        ? ` · ${cliente.neighborhood}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.clientStats}>
                <div>
                  <span>Pedidos</span>
                  <strong>
                    {cliente.total_orders}
                  </strong>
                </div>

                <div>
                  <span>Total gasto</span>
                  <strong>
                    {formatarPreco(
                      cliente.total_spent,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Último pedido</span>
                  <strong>
                    {formatarData(
                      cliente.last_order_at,
                    )}
                  </strong>
                </div>
              </div>

              <div className={styles.clientActions}>
                <button
                  type="button"
                  className={
                    styles.iconButton
                  }
                  onClick={() =>
                    abrirEdicao(cliente)
                  }
                  title="Editar cliente"
                  aria-label={`Editar ${cliente.name}`}
                >
                  <Edit3 size={17} />
                </button>

                <div
                  className={
                    styles.menuWrapper
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.iconButton
                    }
                    onClick={() =>
                      setMenuAberto(
                        (atual) =>
                          atual ===
                          cliente.id
                            ? null
                            : cliente.id,
                      )
                    }
                    aria-label="Mais opções"
                  >
                    <MoreVertical
                      size={18}
                    />
                  </button>

                  {menuAberto ===
                    cliente.id && (
                    <div
                      className={
                        styles.dropdown
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          abrirEdicao(
                            cliente,
                          )
                        }
                      >
                        <Edit3 size={15} />
                        Editar
                      </button>

                      <button
                        type="button"
                        className={
                          styles.deleteAction
                        }
                        onClick={() =>
                          excluirCliente(
                            cliente,
                          )
                        }
                        disabled={
                          clienteExcluindo ===
                          cliente.id
                        }
                      >
                        {clienteExcluindo ===
                        cliente.id ? (
                          <Loader2
                            size={15}
                            className={
                              styles.spin
                            }
                          />
                        ) : (
                          <Trash2
                            size={15}
                          />
                        )}

                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* ===================================================
          MODAL
          =================================================== */}

      {modalAberto && (
        <div
          className={styles.overlay}
          onMouseDown={(evento) => {
            if (
              evento.target ===
              evento.currentTarget
            ) {
              fecharModal()
            }
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cliente-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span
                  className={
                    styles.modalEyebrow
                  }
                >
                  BELO CÃO
                </span>

                <h2 id="cliente-modal-title">
                  {clienteSelecionado
                    ? 'Editar cliente'
                    : 'Novo cliente'}
                </h2>

                <p>
                  {clienteSelecionado
                    ? 'Atualize os dados deste cliente.'
                    : 'Cadastre um novo cliente.'}
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.modalClose
                }
                onClick={fecharModal}
                disabled={salvando}
                aria-label="Fechar"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={salvarCliente}
              className={styles.form}
            >
              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeader
                  }
                >
                  <UserRound size={17} />

                  <div>
                    <h3>
                      Dados do cliente
                    </h3>

                    <p>
                      Informações principais
                    </p>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Nome
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.name
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'name',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="Nome completo"
                      required
                      autoComplete="name"
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      WhatsApp
                    </span>

                    <input
                      type="tel"
                      value={formatarWhatsapp(
                        formulario.whatsapp,
                      )}
                      onChange={(evento) =>
                        atualizarCampo(
                          'whatsapp',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="(12) 99999-9999"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </label>
                </div>
              </div>

              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeader
                  }
                >
                  <MapPin size={17} />

                  <div>
                    <h3>
                      Endereço
                    </h3>

                    <p>
                      Dados para entrega
                    </p>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      CEP
                    </span>

                    <input
                      type="text"
                      value={formatarCep(
                        formulario.cep,
                      )}
                      onChange={(evento) =>
                        atualizarCampo(
                          'cep',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                    />
                  </label>

                  <label
                    className={
                      styles.fieldWide
                    }
                  >
                    <span>
                      Rua
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.street
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'street',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="Nome da rua"
                      autoComplete="street-address"
                    />
                  </label>

                  <label
                    className={
                      styles.fieldSmall
                    }
                  >
                    <span>
                      Número
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.number
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'number',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="123"
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Complemento
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.complement
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'complement',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="Apto, casa..."
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Bairro
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.neighborhood
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'neighborhood',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="Bairro"
                      autoComplete="address-level3"
                    />
                  </label>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Cidade
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.city
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'city',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="Cidade"
                      autoComplete="address-level2"
                    />
                  </label>

                  <label
                    className={
                      styles.fieldFull
                    }
                  >
                    <span>
                      Ponto de referência
                    </span>

                    <input
                      type="text"
                      value={
                        formulario.reference_point
                      }
                      onChange={(evento) =>
                        atualizarCampo(
                          'reference_point',
                          evento.target
                            .value,
                        )
                      }
                      placeholder="Ex.: próximo à praça"
                    />
                  </label>
                </div>
              </div>

              {clienteSelecionado && (
                <div
                  className={
                    styles.customerSummary
                  }
                >
                  <div>
                    <span>
                      Pedidos
                    </span>

                    <strong>
                      {
                        clienteSelecionado.total_orders
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total gasto
                    </span>

                    <strong>
                      {formatarPreco(
                        clienteSelecionado.total_spent,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Último pedido
                    </span>

                    <strong>
                      {formatarDataHora(
                        clienteSelecionado.last_order_at,
                      )}
                    </strong>
                  </div>
                </div>
              )}

              <div
                className={
                  styles.modalFooter
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={fecharModal}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={
                    styles.primaryButton
                  }
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <Loader2
                        size={17}
                        className={
                          styles.spin
                        }
                      />

                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={17} />

                      {clienteSelecionado
                        ? 'Salvar alterações'
                        : 'Cadastrar cliente'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          TOAST
          =================================================== */}

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.tipo ===
            'sucesso'
              ? styles.toastSuccess
              : styles.toastError
          }`}
        >
          {toast.tipo ===
          'sucesso' ? (
            <Check size={18} />
          ) : (
            <AlertTriangle
              size={18}
            />
          )}

          <span>
            {toast.mensagem}
          </span>

          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
            aria-label="Fechar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  )
}