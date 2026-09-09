
'use client'

import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import styles from './Checkout.module.css'

/* =========================================================
   TIPOS
   ========================================================= */

type ProdutoCarrinho = {
  id: string
  name: string
  description?: string | null
  price: number
  category?: string | null
  image_url?: string | null
  stock: number
  active?: boolean
  slug?: string | null
}

export type ItemCarrinho = ProdutoCarrinho & {
  quantidade: number
}

type Cliente = {
  nome: string
  whatsapp: string

  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  referencia: string
}

type FormaEntrega =
  | 'entrega'
  | 'retirada'

type FormaPagamento =
  | 'pix'
  | 'dinheiro'
  | 'cartao'

type CheckoutProps = {
  aberto: boolean
  itens: ItemCarrinho[]
  onFechar: () => void
  onVoltarCarrinho: () => void
  onPedidoFinalizado?: () => void
}

/* =========================================================
   RESPOSTA DA API
   ========================================================= */

type RespostaPedido = {
  sucesso?: boolean
  mensagem?: string
  erro?: string

  pedidoId?: string

  subtotal?: number
  frete?: number
  total?: number
  status?: string

  pedido?: {
    id: string
    subtotal: number
    frete: number
    total: number
    status: string
  }
}

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const WHATSAPP_LOJA = '5512997093459'

/* =========================================================
   HELPERS
   ========================================================= */

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, '')
}

function formatarCEP(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 8)

  if (numeros.length <= 5) {
    return numeros
  }

  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}

function formatarWhatsApp(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11)

  if (numeros.length <= 2) {
    return numeros
  }

  if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  }

  return `(${numeros.slice(
    0,
    2,
  )}) ${numeros.slice(
    2,
    7,
  )}-${numeros.slice(7)}`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export function Checkout({
  aberto,
  itens,
  onFechar,
  onVoltarCarrinho,
  onPedidoFinalizado,
}: CheckoutProps) {
  /* =======================================================
     ESTADOS
     ======================================================= */

  const [etapa, setEtapa] = useState(1)

  const [cliente, setCliente] =
    useState<Cliente>({
      nome: '',
      whatsapp: '',

      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      referencia: '',
    })

  const [formaEntrega, setFormaEntrega] =
    useState<FormaEntrega>('entrega')

  const [formaPagamento, setFormaPagamento] =
    useState<FormaPagamento>('pix')

  const [trocoPara, setTrocoPara] =
    useState('')

  const [buscandoCEP, setBuscandoCEP] =
    useState(false)

  const [enviando, setEnviando] =
    useState(false)

  const [erro, setErro] =
    useState('')

  /*
   * Impede envio duplicado.
   */
  const pedidoFinalizadoRef =
    useRef(false)

  /* =======================================================
     CÁLCULOS
     ======================================================= */

  const subtotal = useMemo(() => {
    return itens.reduce(
      (total, item) => {
        const quantidade =
          Number(item.quantidade) || 0

        const preco =
          Number(item.price) || 0

        return (
          total +
          preco * quantidade
        )
      },
      0,
    )
  }, [itens])

  /*
   * Frete atualmente gratuito.
   */
  const frete =
    formaEntrega === 'entrega'
      ? 0
      : 0

  const total =
    subtotal + frete

  /* =======================================================
     RESET AO ABRIR
     ======================================================= */

  useEffect(() => {
    if (!aberto) {
      return
    }

    setEtapa(1)
    setErro('')
    setEnviando(false)

    setFormaEntrega('entrega')
    setFormaPagamento('pix')
    setTrocoPara('')

    setCliente({
      nome: '',
      whatsapp: '',

      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      referencia: '',
    })

    pedidoFinalizadoRef.current =
      false
  }, [aberto])

  /* =======================================================
     ESC
     ======================================================= */

  useEffect(() => {
    if (!aberto) {
      return
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === 'Escape' &&
        !enviando
      ) {
        onFechar()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    aberto,
    enviando,
    onFechar,
  ])

  /* =======================================================
     ATUALIZAR CLIENTE
     ======================================================= */

  function atualizarCliente(
    campo: keyof Cliente,
    valor: string,
  ) {
    setCliente((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  /* =======================================================
     BUSCAR CEP
     ======================================================= */

  async function buscarCEP() {
    const cep = somenteNumeros(
      cliente.cep,
    )

    if (cep.length !== 8) {
      return
    }

    try {
      setBuscandoCEP(true)
      setErro('')

      const resposta =
        await fetch(
          `https://viacep.com.br/ws/${cep}/json/`,
        )

      if (!resposta.ok) {
        throw new Error(
          'Não foi possível consultar o CEP.',
        )
      }

      const dados =
        await resposta.json()

      if (dados.erro) {
        throw new Error(
          'CEP não encontrado.',
        )
      }

      setCliente((anterior) => ({
        ...anterior,

        cep: formatarCEP(cep),

        rua:
          dados.logradouro ||
          anterior.rua,

        bairro:
          dados.bairro ||
          anterior.bairro,

        cidade:
          dados.localidade ||
          anterior.cidade,

        uf:
          dados.uf ||
          anterior.uf,
      }))
    } catch (error) {
      console.error(
        'Erro ao buscar CEP:',
        error,
      )

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível buscar o CEP.',
      )
    } finally {
      setBuscandoCEP(false)
    }
  }

  /* =======================================================
     VALIDAR ETAPA 1
     ======================================================= */

  function validarEtapa1() {
    if (!cliente.nome.trim()) {
      setErro(
        'Informe seu nome.',
      )

      return false
    }

    const whatsapp =
      somenteNumeros(
        cliente.whatsapp,
      )

    if (whatsapp.length < 10) {
      setErro(
        'Informe um WhatsApp válido.',
      )

      return false
    }

    setErro('')

    return true
  }

  /* =======================================================
     VALIDAR ETAPA 2
     ======================================================= */

  function validarEtapa2() {
    if (
      formaEntrega ===
      'retirada'
    ) {
      setErro('')

      return true
    }

    if (
      somenteNumeros(
        cliente.cep,
      ).length !== 8
    ) {
      setErro(
        'Informe um CEP válido.',
      )

      return false
    }

    if (!cliente.rua.trim()) {
      setErro(
        'Informe sua rua.',
      )

      return false
    }

    if (!cliente.numero.trim()) {
      setErro(
        'Informe o número.',
      )

      return false
    }

    if (!cliente.bairro.trim()) {
      setErro(
        'Informe o bairro.',
      )

      return false
    }

    if (!cliente.cidade.trim()) {
      setErro(
        'Informe a cidade.',
      )

      return false
    }

    setErro('')

    return true
  }

  /* =======================================================
     AVANÇAR
     ======================================================= */

  function avancar() {
    setErro('')

    if (etapa === 1) {
      if (!validarEtapa1()) {
        return
      }

      setEtapa(2)

      return
    }

    if (etapa === 2) {
      if (!validarEtapa2()) {
        return
      }

      setEtapa(3)
    }
  }

  /* =======================================================
     VOLTAR
     ======================================================= */

  function voltar() {
    setErro('')

    if (etapa === 1) {
      onVoltarCarrinho()

      return
    }

    setEtapa(
      (anterior) =>
        anterior - 1,
    )
  }

  /* =======================================================
     MENSAGEM WHATSAPP
     ======================================================= */

  function criarMensagemWhatsApp(
    pedidoId: string,
    subtotalConfirmado: number,
    freteConfirmado: number,
    totalConfirmado: number,
  ) {
    const linhasProdutos =
      itens.map((item) => {
        const quantidade =
          Number(item.quantidade) || 0

        const preco =
          Number(item.price) || 0

        const valor =
          preco * quantidade

        return (
          `• ${item.name} x${quantidade} — ` +
          `${formatarMoeda(valor)}`
        )
      })

    const endereco =
      formaEntrega === 'entrega'
        ? [
            cliente.rua,
            `Nº ${cliente.numero}`,
            cliente.complemento
              ? `Compl.: ${cliente.complemento}`
              : '',
            cliente.bairro,
            `${cliente.cidade} - ${cliente.uf}`,
            `CEP: ${cliente.cep}`,
            cliente.referencia
              ? `Referência: ${cliente.referencia}`
              : '',
          ]
            .filter(Boolean)
            .join(', ')
        : 'Retirada na loja'

    const pagamento =
      formaPagamento === 'pix'
        ? 'Pix'
        : formaPagamento === 'dinheiro'
          ? `Dinheiro${
              trocoPara
                ? ` — troco para ${formatarMoeda(
                    Number(
                      trocoPara.replace(
                        ',',
                        '.',
                      ),
                    ) || 0,
                  )}`
                : ''
            }`
          : 'Cartão'

    return [
      `🐶 *BELO CÃO — NOVO PEDIDO*`,
      ``,
      `📋 *Pedido:* ${pedidoId}`,
      ``,
      `👤 *Cliente:* ${cliente.nome}`,
      `📱 *WhatsApp:* ${cliente.whatsapp}`,
      ``,
      `🛍️ *ITENS DO PEDIDO*`,
      ...linhasProdutos,
      ``,
      `🚚 *ENTREGA:* ${
        formaEntrega ===
        'entrega'
          ? 'Entrega'
          : 'Retirada na loja'
      }`,
      `📍 *Endereço:* ${endereco}`,
      ``,
      `💳 *Pagamento:* ${pagamento}`,
      ``,
      `Subtotal: ${formatarMoeda(
        subtotalConfirmado,
      )}`,
      `Frete: ${formatarMoeda(
        freteConfirmado,
      )}`,
      `*TOTAL: ${formatarMoeda(
        totalConfirmado,
      )}*`,
      ``,
      `Obrigado por comprar na Belo Cão! 🐾`,
    ].join('\n')
  }

  /* =======================================================
     ENVIAR PEDIDO
     ======================================================= */

  async function enviarPedido() {
    /*
     * Impede duplo clique.
     */
    if (enviando) {
      return
    }

    /*
     * Impede segundo envio depois
     * de um pedido confirmado.
     */
    if (
      pedidoFinalizadoRef.current
    ) {
      return
    }

    /* =====================================================
       VALIDAR CARRINHO
       ===================================================== */

    if (!itens.length) {
      setErro(
        'Seu carrinho está vazio.',
      )

      return
    }

    /* =====================================================
       VALIDAR CLIENTE
       ===================================================== */

    if (!validarEtapa1()) {
      setEtapa(1)

      return
    }

    /* =====================================================
       VALIDAR ENTREGA
       ===================================================== */

    if (!validarEtapa2()) {
      setEtapa(2)

      return
    }

    const whatsapp =
      somenteNumeros(
        cliente.whatsapp,
      )

    if (whatsapp.length < 10) {
      setErro(
        'Informe um WhatsApp válido.',
      )

      setEtapa(1)

      return
    }

    try {
      setEnviando(true)
      setErro('')

      /* =================================================
         PREPARAR ITENS

         IMPORTANTE:
         A API /api/pedidos espera:

         {
           id: UUID_DO_PRODUTO,
           quantidade: number
         }

         NÃO usar "productId" aqui.
         ================================================= */

      const itensPedido =
        itens.map((item) => ({
          id: item.id,
          quantidade:
            Number(item.quantidade) || 0,
        }))

      /*
       * Segurança adicional:
       * não permite enviar item com
       * quantidade inválida.
       */
      const itemInvalido =
        itensPedido.some(
          (item) =>
            !item.id ||
            item.quantidade <= 0,
        )

      if (itemInvalido) {
        throw new Error(
          'Existe um produto inválido no carrinho. Atualize a página e tente novamente.',
        )
      }

      /* =================================================
         DADOS DO PEDIDO
         ================================================= */

      const payload = {
        cliente: {
          nome:
            cliente.nome.trim(),

          whatsapp,

          cep:
            cliente.cep.trim(),

          rua:
            cliente.rua.trim(),

          numero:
            cliente.numero.trim(),

          complemento:
            cliente.complemento.trim(),

          bairro:
            cliente.bairro.trim(),

          cidade:
            cliente.cidade.trim(),

          uf:
            cliente.uf.trim(),

          referencia:
            cliente.referencia.trim(),
        },

        formaEntrega,

        formaPagamento,

        trocoPara:
          formaPagamento ===
          'dinheiro'
            ? Number(
                trocoPara.replace(
                  ',',
                  '.',
                ),
              ) || null
            : null,

        /*
         * IMPORTANTE:
         * itens agora possui "id",
         * exatamente como a API espera.
         */
        itens: itensPedido,

        subtotal,
        frete,
        total,
      }

      /* =================================================
         CRIAR PEDIDO NO BANCO
         ================================================= */

      const resposta =
        await fetch(
          '/api/pedidos',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              payload,
            ),
          },
        )

      let dados: RespostaPedido =
        {}

      try {
        dados =
          await resposta.json()
      } catch {
        dados = {}
      }

      /* =================================================
         ERRO DE ESTOQUE / CONFLITO
         ================================================= */

      if (
        resposta.status === 409
      ) {
        setErro(
          dados.erro ||
            dados.mensagem ||
            'Um ou mais produtos ficaram sem estoque. Atualize o carrinho e tente novamente.',
        )

        setEnviando(false)

        return
      }

      /* =================================================
         OUTROS ERROS DA API
         ================================================= */

      if (
        !resposta.ok ||
        !dados.sucesso
      ) {
        throw new Error(
          dados.erro ||
            dados.mensagem ||
            'Não foi possível finalizar o pedido.',
        )
      }

      /* =================================================
         ID DO PEDIDO
         ================================================= */

      const pedidoId =
        dados.pedidoId ||
        dados.pedido?.id

      if (!pedidoId) {
        throw new Error(
          'O pedido foi criado, mas a API não retornou o número do pedido.',
        )
      }

      /* =================================================
         VALORES CONFIRMADOS PELA API
         ================================================= */

      const subtotalConfirmado =
        Number(
          dados.pedido?.subtotal ??
            dados.subtotal ??
            subtotal,
        )

      const freteConfirmado =
        Number(
          dados.pedido?.frete ??
            dados.frete ??
            0,
        )

      const totalConfirmado =
        Number(
          dados.pedido?.total ??
            dados.total ??
            subtotalConfirmado +
              freteConfirmado,
        )

      /* =================================================
         MONTAR MENSAGEM WHATSAPP
         ================================================= */

      const mensagem =
        criarMensagemWhatsApp(
          pedidoId,
          subtotalConfirmado,
          freteConfirmado,
          totalConfirmado,
        )

      const url =
        `https://wa.me/${WHATSAPP_LOJA}` +
        `?text=${encodeURIComponent(
          mensagem,
        )}`

      /* =================================================
         ABRIR WHATSAPP
         ================================================= */

      const janela =
        window.open(
          url,
          '_blank',
          'noopener,noreferrer',
        )

      /*
       * Neste momento o pedido já foi:
       *
       * 1. criado em orders;
       * 2. registrado em order_items;
       * 3. estoque baixado;
       * 4. transação confirmada.
       *
       * Portanto, o pedido está finalizado
       * mesmo que o navegador bloqueie o WhatsApp.
       */

      pedidoFinalizadoRef.current =
        true

      /* =================================================
         FINALIZAR NO LOJAPAGE
         ================================================= */

      /*
       * O LojaPage irá:
       *
       * - setCarrinho([]);
       * - limpar localStorage;
       * - fechar checkout;
       * - fechar carrinho;
       * - atualizar produtos/estoque.
       */
      onPedidoFinalizado?.()

      /* =================================================
         WHATSAPP BLOQUEADO
         ================================================= */

      if (!janela) {
        console.warn(
          'O navegador bloqueou a abertura do WhatsApp.',
        )
      }

      /*
       * Não fazemos setEnviando(false)
       * porque o Checkout pode ser desmontado
       * imediatamente pelo LojaPage.
       */
      return
    } catch (error) {
      console.error(
        'Erro ao finalizar pedido:',
        error,
      )

      /*
       * Só mostra erro se o pedido
       * realmente não foi finalizado.
       */
      if (
        !pedidoFinalizadoRef.current
      ) {
        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível finalizar o pedido. Tente novamente.',
        )

        setEnviando(false)
      }
    }
  }

  /* =======================================================
     NÃO RENDERIZAR
     ======================================================= */

  if (!aberto) {
    return null
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar pedido"
    >
      <div
        className={styles.container}
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <header
          className={styles.header}
        >
          <button
            type="button"
            className={
              styles.closeButton
            }
            onClick={() => {
              if (!enviando) {
                onFechar()
              }
            }}
            disabled={enviando}
            aria-label="Fechar"
          >
            <X size={22} />
          </button>

          <div
            className={styles.headerInfo}
          >
            <span
              className={
                styles.headerEyebrow
              }
            >
              BELO CÃO
            </span>

            <h1
              className={styles.title}
            >
              Finalizar pedido
            </h1>
          </div>
        </header>

        {/* =================================================
            PROGRESSO
            ================================================= */}

        <div
          className={
            styles.progressWrapper
          }
        >
          <div
            className={styles.progress}
          >
            <div
              className={`${styles.progressStep} ${
                etapa >= 1
                  ? styles.active
                  : ''
              } ${
                etapa > 1
                  ? styles.completed
                  : ''
              }`}
            >
              <span
                className={
                  styles.progressNumber
                }
              >
                {etapa > 1 ? (
                  <Check size={14} />
                ) : (
                  '1'
                )}
              </span>

              <span
                className={
                  styles.progressLabel
                }
              >
                Seus dados
              </span>
            </div>

            <div
              className={`${styles.progressLine} ${
                etapa > 1
                  ? styles.completedLine
                  : ''
              }`}
            />

            <div
              className={`${styles.progressStep} ${
                etapa >= 2
                  ? styles.active
                  : ''
              } ${
                etapa > 2
                  ? styles.completed
                  : ''
              }`}
            >
              <span
                className={
                  styles.progressNumber
                }
              >
                {etapa > 2 ? (
                  <Check size={14} />
                ) : (
                  '2'
                )}
              </span>

              <span
                className={
                  styles.progressLabel
                }
              >
                Entrega
              </span>
            </div>

            <div
              className={`${styles.progressLine} ${
                etapa > 2
                  ? styles.completedLine
                  : ''
              }`}
            />

            <div
              className={`${styles.progressStep} ${
                etapa >= 3
                  ? styles.active
                  : ''
              }`}
            >
              <span
                className={
                  styles.progressNumber
                }
              >
                3
              </span>

              <span
                className={
                  styles.progressLabel
                }
              >
                Pagamento
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            CONTEÚDO
            ================================================= */}

        <main
          className={styles.content}
        >
          {/* ===============================================
              ETAPA 1
              =============================================== */}

          {etapa === 1 && (
            <section
              className={
                styles.step
              }
            >
              <div
                className={
                  styles.stepHeader
                }
              >
                <div
                  className={
                    styles.stepIcon
                  }
                >
                  <User size={20} />
                </div>

                <div>
                  <span
                    className={
                      styles.stepCounter
                    }
                  >
                    PASSO 1 DE 3
                  </span>

                  <h2
                    className={
                      styles.stepTitle
                    }
                  >
                    Seus dados
                  </h2>

                  <p
                    className={
                      styles.stepDescription
                    }
                  >
                    Informe seus dados
                    para identificarmos
                    seu pedido.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.form
                }
              >
                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="nome"
                  >
                    Nome
                  </label>

                  <input
                    id="nome"
                    type="text"
                    value={
                      cliente.nome
                    }
                    onChange={(
                      event,
                    ) =>
                      atualizarCliente(
                        'nome',
                        event.target
                          .value,
                      )
                    }
                    placeholder="Como podemos te chamar?"
                    autoComplete="name"
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="whatsapp"
                  >
                    WhatsApp
                  </label>

                  <div
                    className={
                      styles.inputWithIcon
                    }
                  >
                    <MessageCircle
                      size={18}
                    />

                    <input
                      id="whatsapp"
                      type="tel"
                      value={
                        cliente.whatsapp
                      }
                      onChange={(
                        event,
                      ) =>
                        atualizarCliente(
                          'whatsapp',
                          formatarWhatsApp(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      placeholder="(00) 00000-0000"
                      autoComplete="tel"
                    />
                  </div>

                  <small>
                    Usaremos este número
                    para confirmar seu
                    pedido.
                  </small>
                </div>
              </div>
            </section>
          )}

          {/* ===============================================
              ETAPA 2
              =============================================== */}

          {etapa === 2 && (
            <section
              className={
                styles.step
              }
            >
              <div
                className={
                  styles.stepHeader
                }
              >
                <div
                  className={
                    styles.stepIcon
                  }
                >
                  <Truck size={20} />
                </div>

                <div>
                  <span
                    className={
                      styles.stepCounter
                    }
                  >
                    PASSO 2 DE 3
                  </span>

                  <h2
                    className={
                      styles.stepTitle
                    }
                  >
                    Como você quer
                    receber?
                  </h2>

                  <p
                    className={
                      styles.stepDescription
                    }
                  >
                    Escolha entre receber
                    seu pedido ou retirar
                    na loja.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.deliveryOptions
                }
              >
                <button
                  type="button"
                  className={`${styles.deliveryOption} ${
                    formaEntrega ===
                    'entrega'
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() =>
                    setFormaEntrega(
                      'entrega',
                    )
                  }
                >
                  <div
                    className={
                      styles.deliveryIcon
                    }
                  >
                    <Truck
                      size={22}
                    />
                  </div>

                  <div
                    className={
                      styles.deliveryText
                    }
                  >
                    <strong>
                      Entrega
                    </strong>

                    <span>
                      Receba seu pedido
                      no endereço
                      informado.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaEntrega ===
                      'entrega' && (
                      <span />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.deliveryOption} ${
                    formaEntrega ===
                    'retirada'
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() =>
                    setFormaEntrega(
                      'retirada',
                    )
                  }
                >
                  <div
                    className={
                      styles.deliveryIcon
                    }
                  >
                    <Store
                      size={22}
                    />
                  </div>

                  <div
                    className={
                      styles.deliveryText
                    }
                  >
                    <strong>
                      Retirada na loja
                    </strong>

                    <span>
                      Retire seu pedido
                      diretamente na
                      loja.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaEntrega ===
                      'retirada' && (
                      <span />
                    )}
                  </span>
                </button>
              </div>

              {formaEntrega ===
                'entrega' && (
                <div
                  className={
                    styles.addressSection
                  }
                >
                  <div
                    className={
                      styles.addressHeader
                    }
                  >
                    <MapPin
                      size={18}
                    />

                    <span>
                      Endereço de
                      entrega
                    </span>
                  </div>

                  <div
                    className={
                      styles.form
                    }
                  >
                    <div
                      className={
                        styles.field
                      }
                    >
                      <label
                        htmlFor="cep"
                      >
                        CEP
                      </label>

                      <div
                        className={
                          styles.cepRow
                        }
                      >
                        <input
                          id="cep"
                          type="text"
                          inputMode="numeric"
                          value={
                            cliente.cep
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'cep',
                              formatarCEP(
                                event
                                  .target
                                  .value,
                              ),
                            )
                          }
                          onBlur={
                            buscarCEP
                          }
                          placeholder="00000-000"
                          autoComplete="postal-code"
                        />

                        <button
                          type="button"
                          onClick={
                            buscarCEP
                          }
                          disabled={
                            buscandoCEP
                          }
                        >
                          {buscandoCEP ? (
                            <Loader2
                              size={16}
                              className={
                                styles.spin
                              }
                            />
                          ) : (
                            'Buscar'
                          )}
                        </button>
                      </div>
                    </div>

                    <div
                      className={
                        styles.field
                      }
                    >
                      <label
                        htmlFor="rua"
                      >
                        Rua
                      </label>

                      <input
                        id="rua"
                        type="text"
                        value={
                          cliente.rua
                        }
                        onChange={(
                          event,
                        ) =>
                          atualizarCliente(
                            'rua',
                            event.target
                              .value,
                          )
                        }
                        placeholder="Nome da rua"
                        autoComplete="street-address"
                      />
                    </div>

                    <div
                      className={
                        styles.formRow
                      }
                    >
                      <div
                        className={
                          styles.field
                        }
                      >
                        <label
                          htmlFor="numero"
                        >
                          Número
                        </label>

                        <input
                          id="numero"
                          type="text"
                          value={
                            cliente.numero
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'numero',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="123"
                          autoComplete="address-line2"
                        />
                      </div>

                      <div
                        className={
                          styles.field
                        }
                      >
                        <label
                          htmlFor="complemento"
                        >
                          Complemento
                          <span>
                            {' '}
                            (opcional)
                          </span>
                        </label>

                        <input
                          id="complemento"
                          type="text"
                          value={
                            cliente.complemento
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'complemento',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Apto, casa..."
                        />
                      </div>
                    </div>

                    <div
                      className={
                        styles.formRow
                      }
                    >
                      <div
                        className={
                          styles.field
                        }
                      >
                        <label
                          htmlFor="bairro"
                        >
                          Bairro
                        </label>

                        <input
                          id="bairro"
                          type="text"
                          value={
                            cliente.bairro
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'bairro',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Seu bairro"
                          autoComplete="address-level3"
                        />
                      </div>

                      <div
                        className={
                          styles.field
                        }
                      >
                        <label
                          htmlFor="cidade"
                        >
                          Cidade
                        </label>

                        <input
                          id="cidade"
                          type="text"
                          value={
                            cliente.cidade
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'cidade',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Sua cidade"
                          autoComplete="address-level2"
                        />
                      </div>
                    </div>

                    <div
                      className={
                        styles.formRow
                      }
                    >
                      <div
                        className={
                          styles.field
                        }
                      >
                        <label
                          htmlFor="uf"
                        >
                          Estado
                        </label>

                        <input
                          id="uf"
                          type="text"
                          value={
                            cliente.uf
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'uf',
                              event
                                .target
                                .value
                                .toUpperCase()
                                .slice(
                                  0,
                                  2,
                                ),
                            )
                          }
                          placeholder="SP"
                          maxLength={2}
                          autoComplete="address-level1"
                        />
                      </div>

                      <div
                        className={
                          styles.field
                        }
                      >
                        <label
                          htmlFor="referencia"
                        >
                          Referência
                          <span>
                            {' '}
                            (opcional)
                          </span>
                        </label>

                        <input
                          id="referencia"
                          type="text"
                          value={
                            cliente.referencia
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarCliente(
                              'referencia',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Perto de..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formaEntrega ===
                'retirada' && (
                <div
                  className={
                    styles.pickupBox
                  }
                >
                  <Store
                    size={22}
                  />

                  <div>
                    <strong>
                      Retirada na loja
                    </strong>

                    <p>
                      Seu pedido ficará
                      disponível para
                      retirada diretamente
                      na loja.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ===============================================
              ETAPA 3
              =============================================== */}

          {etapa === 3 && (
            <section
              className={
                styles.step
              }
            >
              <div
                className={
                  styles.stepHeader
                }
              >
                <div
                  className={
                    styles.stepIcon
                  }
                >
                  <ShoppingBag
                    size={20}
                  />
                </div>

                <div>
                  <span
                    className={
                      styles.stepCounter
                    }
                  >
                    PASSO 3 DE 3
                  </span>

                  <h2
                    className={
                      styles.stepTitle
                    }
                  >
                    Pagamento
                  </h2>

                  <p
                    className={
                      styles.stepDescription
                    }
                  >
                    Escolha como deseja
                    pagar seu pedido.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.paymentOptions
                }
              >
                <button
                  type="button"
                  className={`${styles.paymentOption} ${
                    formaPagamento ===
                    'pix'
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() =>
                    setFormaPagamento(
                      'pix',
                    )
                  }
                >
                  <div
                    className={
                      styles.paymentIcon
                    }
                  >
                    <span>
                      PIX
                    </span>
                  </div>

                  <div
                    className={
                      styles.paymentText
                    }
                  >
                    <strong>
                      Pix
                    </strong>

                    <span>
                      Pagamento rápido
                      e seguro.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaPagamento ===
                      'pix' && (
                      <span />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.paymentOption} ${
                    formaPagamento ===
                    'dinheiro'
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() =>
                    setFormaPagamento(
                      'dinheiro',
                    )
                  }
                >
                  <div
                    className={
                      styles.paymentIcon
                    }
                  >
                    <span>
                      R$
                    </span>
                  </div>

                  <div
                    className={
                      styles.paymentText
                    }
                  >
                    <strong>
                      Dinheiro
                    </strong>

                    <span>
                      Pague na entrega
                      ou retirada.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaPagamento ===
                      'dinheiro' && (
                      <span />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.paymentOption} ${
                    formaPagamento ===
                    'cartao'
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() =>
                    setFormaPagamento(
                      'cartao',
                    )
                  }
                >
                  <div
                    className={
                      styles.paymentIcon
                    }
                  >
                    <span>
                      CARD
                    </span>
                  </div>

                  <div
                    className={
                      styles.paymentText
                    }
                  >
                    <strong>
                      Cartão
                    </strong>

                    <span>
                      Débito ou crédito.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaPagamento ===
                      'cartao' && (
                      <span />
                    )}
                  </span>
                </button>
              </div>

              {formaPagamento ===
                'dinheiro' && (
                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="troco"
                  >
                    Troco para
                    <span>
                      {' '}
                      (opcional)
                    </span>
                  </label>

                  <input
                    id="troco"
                    type="text"
                    inputMode="decimal"
                    value={
                      trocoPara
                    }
                    onChange={(
                      event,
                    ) =>
                      setTrocoPara(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Ex.: 100,00"
                  />

                  <small>
                    Informe quanto você
                    entregará para que
                    possamos preparar o
                    troco.
                  </small>
                </div>
              )}

              {/* =========================================
                  RESUMO
                  ========================================= */}

              <div
                className={
                  styles.summary
                }
              >
                <div
                  className={
                    styles.summaryHeader
                  }
                >
                  <Package
                    size={18}
                  />

                  <span>
                    Resumo do pedido
                  </span>
                </div>

                <div
                  className={
                    styles.summaryItems
                  }
                >
                  {itens.map(
                    (item) => {
                      const quantidade =
                        Number(
                          item.quantidade,
                        ) || 0

                      const preco =
                        Number(
                          item.price,
                        ) || 0

                      const valor =
                        preco *
                        quantidade

                      return (
                        <div
                          key={
                            item.id
                          }
                          className={
                            styles.summaryItem
                          }
                        >
                          <div>
                            <strong>
                              {
                                item.name
                              }
                            </strong>

                            <span>
                              {
                                quantidade
                              }{' '}
                              x{' '}
                              {formatarMoeda(
                                preco,
                              )}
                            </span>
                          </div>

                          <strong>
                            {formatarMoeda(
                              valor,
                            )}
                          </strong>
                        </div>
                      )
                    },
                  )}
                </div>

                <div
                  className={
                    styles.summaryTotals
                  }
                >
                  <div>
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {formatarMoeda(
                        subtotal,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Frete
                    </span>

                    <strong>
                      {frete === 0
                        ? 'Grátis'
                        : formatarMoeda(
                            frete,
                          )}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.summaryTotal
                    }
                  >
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatarMoeda(
                        total,
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =================================================
              ERRO
              ================================================= */}

          {erro && (
            <div
              className={
                styles.error
              }
              role="alert"
            >
              <span>
                {erro}
              </span>

              <button
                type="button"
                onClick={() =>
                  setErro('')
                }
                aria-label="Fechar mensagem"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </main>

        {/* =================================================
            FOOTER
            ================================================= */}

        <footer
          className={styles.footer}
        >
          <button
            type="button"
            className={
              styles.backButton
            }
            onClick={voltar}
            disabled={enviando}
          >
            <ArrowLeft
              size={18}
            />

            <span>
              {etapa === 1
                ? 'Voltar ao carrinho'
                : 'Voltar'}
            </span>
          </button>

          {etapa < 3 ? (
            <button
              type="button"
              className={
                styles.continueButton
              }
              onClick={avancar}
              disabled={enviando}
            >
              <span>
                Continuar
              </span>

              <ArrowLeft
                size={18}
                className={
                  styles.arrowRight
                }
              />
            </button>
          ) : (
            <button
              type="button"
              className={
                styles.continueButton
              }
              onClick={
                enviarPedido
              }
              disabled={
                enviando ||
                pedidoFinalizadoRef.current
              }
            >
              {enviando ? (
                <>
                  <Loader2
                    size={18}
                    className={
                      styles.spin
                    }
                  />

                  <span>
                    Finalizando...
                  </span>
                </>
              ) : (
                <>
                  <MessageCircle
                    size={18}
                  />

                  <span>
                    Finalizar pedido
                  </span>
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
