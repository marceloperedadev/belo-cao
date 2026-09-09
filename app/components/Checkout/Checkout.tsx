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

  /*
   * UF existe somente no frontend.
   * A tabela customers NÃO possui coluna uf.
   */
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
   RESPOSTA DA API — PEDIDO
   ========================================================= */

type RespostaPedido = {
  sucesso?: boolean
  mensagem?: string
  erro?: string

  /*
   * UUID interno do pedido.
   * NÃO deve ser exibido para o cliente.
   */
  pedidoId?: string

  /*
   * Número sequencial do pedido.
   */
  orderNumber?: number
  order_number?: number

  /*
   * Número já formatado pela API.
   */
  numeroPedido?: string

  subtotal?: number
  frete?: number
  total?: number

  freteACombinar?: boolean

  status?: string

  pedido?: {
    id: string

    customerId?: string
    customer_id?: string

    orderNumber?: number
    order_number?: number

    numeroPedido?: string

    subtotal: number
    frete: number
    total: number
    status: string
    freteACombinar?: boolean
  }
}

/* =========================================================
   RESPOSTA DA API — CLIENTE
   ========================================================= */

type RespostaCliente = {
  sucesso?: boolean
  encontrado?: boolean
  erro?: string

  cliente?: {
    id: string
    name: string
    whatsapp: string

    cep?: string | null
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    reference_point?: string | null
  } | null
}

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const WHATSAPP_LOJA = '5512997093459'

const STORAGE_WHATSAPP =
  'belo-cao-cliente-whatsapp'

/* =========================================================
   EMOJIS — UNICODE SEGURO
   ========================================================= */

const ICONES_WHATSAPP = {
  cachorro: '\u{1F436}',
  pedido: '\u{1F4CB}',
  cliente: '\u{1F464}',
  whatsapp: '\u{1F4F1}',
  sacola: '\u{1F6CD}\uFE0F',
  entrega: '\u{1F69A}',
  local: '\u{1F4CD}',
  pagamento: '\u{1F4B3}',
  alerta: '\u{26A0}\uFE0F',
  patas: '\u{1F43E}',
}

/* =========================================================
   HELPERS
   ========================================================= */

function somenteNumeros(
  valor: string,
): string {
  return valor.replace(/\D/g, '')
}

/* =========================================================
   NORMALIZAR WHATSAPP
   ========================================================= */

function normalizarWhatsApp(
  valor: string,
): string {
  const numeros =
    somenteNumeros(valor)

  if (!numeros) {
    return ''
  }

  if (numeros.startsWith('55')) {
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

/* =========================================================
   FORMATAR CEP
   ========================================================= */

function formatarCEP(
  valor: string,
): string {
  const numeros =
    somenteNumeros(valor).slice(
      0,
      8,
    )

  if (numeros.length <= 5) {
    return numeros
  }

  return `${numeros.slice(
    0,
    5,
  )}-${numeros.slice(5)}`
}

/* =========================================================
   FORMATAR WHATSAPP
   ========================================================= */

function formatarWhatsApp(
  valor: string,
): string {
  let numeros =
    somenteNumeros(valor)

  if (
    numeros.startsWith('55') &&
    numeros.length >= 12
  ) {
    numeros = numeros.slice(2)
  }

  numeros = numeros.slice(0, 11)

  if (numeros.length <= 2) {
    return numeros
  }

  if (numeros.length <= 7) {
    return `(${numeros.slice(
      0,
      2,
    )}) ${numeros.slice(2)}`
  }

  return `(${numeros.slice(
    0,
    2,
  )}) ${numeros.slice(
    2,
    7,
  )}-${numeros.slice(7)}`
}

/* =========================================================
   FORMATAR MOEDA
   ========================================================= */

function formatarMoeda(
  valor: number,
): string {
  return Number(
    valor || 0,
  ).toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  )
}

/* =========================================================
   FORMATAR CAMPO DE TROCO
   =========================================================

   O campo trabalha internamente com centavos.

   Exemplos:

   1       -> 0,01
   10      -> 0,10
   100     -> 1,00
   10000   -> 100,00
   10050   -> 100,50

   Isso evita que o usuário consiga inserir letras,
   símbolos ou formatos inválidos.
   ========================================================= */

function formatarTroco(
  valor: string,
): string {
  let numeros =
    somenteNumeros(valor)

  if (!numeros) {
    return ''
  }

  /*
   * Remove zeros à esquerda,
   * mantendo pelo menos um número.
   */
  numeros =
    numeros.replace(
      /^0+(?=\d)/,
      '',
    )

  /*
   * Limite de segurança.
   *
   * 12 dígitos em centavos permitem
   * valores extremamente maiores que
   * qualquer pedido normal.
   */
  numeros =
    numeros.slice(0, 12)

  const valorNumerico =
    Number(numeros) / 100

  if (
    !Number.isFinite(
      valorNumerico,
    )
  ) {
    return ''
  }

  return valorNumerico.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )
}

/* =========================================================
   CONVERTER TROCO
   ========================================================= */

function converterNumero(
  valor: string,
): number | null {
  if (!valor.trim()) {
    return null
  }

  /*
   * O campo já vem formatado como:
   *
   * 100,00
   * 1.000,00
   *
   * Portanto:
   *
   * 1.000,00 -> 1000.00
   */
  const normalizado =
    valor
      .trim()
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')

  const numero =
    Number(normalizado)

  if (
    !Number.isFinite(numero) ||
    numero <= 0
  ) {
    return null
  }

  return numero
}

/* =========================================================
   FORMATAR NÚMERO DO PEDIDO
   ========================================================= */

function formatarNumeroPedido(
  valor:
    | number
    | string
    | null
    | undefined,
): string {
  const numero = Number(valor)

  if (
    !Number.isFinite(numero) ||
    numero <= 0
  ) {
    return ''
  }

  return `#${String(
    Math.trunc(numero),
  ).padStart(5, '0')}`
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

  const [etapa, setEtapa] =
    useState(1)

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

  const [
    buscandoCliente,
    setBuscandoCliente,
  ] = useState(false)

  const [
    clienteEncontrado,
    setClienteEncontrado,
  ] = useState(false)

  const [
    clienteConsultado,
    setClienteConsultado,
  ] = useState(false)

  const [
    formaEntrega,
    setFormaEntrega,
  ] =
    useState<FormaEntrega>(
      'entrega',
    )

  const [
    formaPagamento,
    setFormaPagamento,
  ] =
    useState<FormaPagamento>(
      'pix',
    )

  const [trocoPara, setTrocoPara] =
    useState('')

  const [
    buscandoCEP,
    setBuscandoCEP,
  ] = useState(false)

  const [enviando, setEnviando] =
    useState(false)

  const [erro, setErro] =
    useState('')

  /*
   * Guarda o UUID interno do pedido
   * somente para controle interno.
   */
  const pedidoFinalizadoRef =
    useRef(false)

  /*
   * Guarda o último WhatsApp consultado.
   */
  const consultaClienteRef =
    useRef('')

  /* =======================================================
     CÁLCULOS
     ======================================================= */

  const subtotal = useMemo(() => {
    return itens.reduce(
      (
        totalAtual,
        item,
      ) => {
        const quantidade =
          Number(
            item.quantidade,
          ) || 0

        const preco =
          Number(item.price) || 0

        return (
          totalAtual +
          preco * quantidade
        )
      },
      0,
    )
  }, [itens])

  /*
   * ENTREGA:
   * frete ainda não definido.
   *
   * RETIRADA:
   * frete = 0.
   */

  const freteACombinar =
    formaEntrega === 'entrega'

  const frete =
    formaEntrega === 'retirada'
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

    setClienteEncontrado(false)
    setClienteConsultado(false)
    setBuscandoCliente(false)

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

    consultaClienteRef.current = ''

    pedidoFinalizadoRef.current =
      false
  }, [aberto])

  /* =======================================================
     LIMPAR TROCO AO TROCAR PAGAMENTO
     ======================================================= */

  useEffect(() => {
    if (
      formaPagamento !==
      'dinheiro'
    ) {
      setTrocoPara('')
    }
  }, [formaPagamento])

  /* =======================================================
     RECUPERAR WHATSAPP SALVO
     ======================================================= */

  useEffect(() => {
    if (!aberto) {
      return
    }

    try {
      const whatsappSalvo =
        window.localStorage.getItem(
          STORAGE_WHATSAPP,
        )

      if (!whatsappSalvo) {
        return
      }

      const whatsapp =
        somenteNumeros(
          whatsappSalvo,
        )

      if (
        whatsapp.length < 10
      ) {
        return
      }

      setCliente(
        (anterior) => ({
          ...anterior,

          whatsapp:
            formatarWhatsApp(
              whatsapp,
            ),
        }),
      )
    } catch (error) {
      console.warn(
        'Não foi possível recuperar o WhatsApp salvo:',
        error,
      )
    }
  }, [aberto])

  /* =======================================================
     BUSCAR CLIENTE AUTOMATICAMENTE
     ======================================================= */

  useEffect(() => {
    if (!aberto) {
      return
    }

    const whatsapp =
      normalizarWhatsApp(
        cliente.whatsapp,
      )

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      setClienteEncontrado(false)
      setClienteConsultado(false)

      return
    }

    if (
      consultaClienteRef.current ===
      whatsapp
    ) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void buscarCliente(
          whatsapp,
        )
      }, 450)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    aberto,
    cliente.whatsapp,
  ])

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
    if (
      campo === 'whatsapp'
    ) {
      const formatado =
        formatarWhatsApp(valor)

      setCliente(
        (anterior) => ({
          ...anterior,
          whatsapp: formatado,
        }),
      )

      setClienteEncontrado(false)
      setClienteConsultado(false)

      consultaClienteRef.current =
        ''

      return
    }

    setCliente(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      }),
    )
  }

  /* =======================================================
     BUSCAR CLIENTE
     ======================================================= */

  async function buscarCliente(
    whatsappInformado: string,
  ) {
    const whatsapp =
      normalizarWhatsApp(
        whatsappInformado,
      )

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      return
    }

    consultaClienteRef.current =
      whatsapp

    try {
      setBuscandoCliente(true)
      setErro('')

      const resposta =
        await fetch(
          `/api/clientes?whatsapp=${encodeURIComponent(
            whatsapp,
          )}`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

      let dados: RespostaCliente =
        {}

      try {
        dados =
          await resposta.json()
      } catch {
        dados = {}
      }

      if (!resposta.ok) {
        throw new Error(
          dados.erro ||
            'Não foi possível consultar seu cadastro.',
        )
      }

      setClienteConsultado(true)

      /* ===================================================
         CLIENTE NÃO ENCONTRADO
         =================================================== */

      if (
        !dados.encontrado ||
        !dados.cliente
      ) {
        setClienteEncontrado(false)

        setCliente(
          (anterior) => ({
            ...anterior,

            whatsapp:
              formatarWhatsApp(
                whatsapp,
              ),
          }),
        )

        return
      }

      /* ===================================================
         CLIENTE ENCONTRADO
         =================================================== */

      const clienteApi =
        dados.cliente

      setClienteEncontrado(true)

      setCliente(
        (anterior) => ({
          ...anterior,

          nome:
            clienteApi.name ||
            anterior.nome,

          whatsapp:
            formatarWhatsApp(
              clienteApi.whatsapp ||
                whatsapp,
            ),

          cep:
            clienteApi.cep
              ? formatarCEP(
                  clienteApi.cep,
                )
              : anterior.cep,

          rua:
            clienteApi.street ||
            anterior.rua,

          numero:
            clienteApi.number ||
            anterior.numero,

          complemento:
            clienteApi.complement ||
            anterior.complemento,

          bairro:
            clienteApi.neighborhood ||
            anterior.bairro,

          cidade:
            clienteApi.city ||
            anterior.cidade,

          uf: anterior.uf,

          referencia:
            clienteApi.reference_point ||
            anterior.referencia,
        }),
      )

      try {
        window.localStorage.setItem(
          STORAGE_WHATSAPP,
          whatsapp,
        )
      } catch (error) {
        console.warn(
          'Não foi possível salvar o WhatsApp:',
          error,
        )
      }
    } catch (error) {
      console.error(
        'Erro ao buscar cliente:',
        error,
      )

      setClienteConsultado(true)
      setClienteEncontrado(false)

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar seu cadastro.',
      )
    } finally {
      setBuscandoCliente(false)
    }
  }

  /* =======================================================
     BUSCAR CEP
     ======================================================= */

  async function buscarCEP() {
    const cep =
      somenteNumeros(
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

      setCliente(
        (anterior) => ({
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
        }),
      )
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

    if (
      whatsapp.length !== 10 &&
      whatsapp.length !== 11
    ) {
      setErro(
        'Informe um WhatsApp válido.',
      )

      return false
    }

    try {
      window.localStorage.setItem(
        STORAGE_WHATSAPP,
        normalizarWhatsApp(
          cliente.whatsapp,
        ),
      )
    } catch (error) {
      console.warn(
        'Não foi possível salvar o WhatsApp:',
        error,
      )
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
        'Informe sua cidade.',
      )

      return false
    }

    if (!cliente.uf.trim()) {
      setErro(
        'Informe o estado.',
      )

      return false
    }

    setErro('')

    return true
  }

  /* =======================================================
     VALIDAR PAGAMENTO
     ======================================================= */

  function validarPagamento() {
    if (
      formaPagamento !==
      'dinheiro'
    ) {
      setErro('')

      return true
    }

    /*
     * Troco é opcional.
     *
     * Se estiver vazio, seguimos normalmente.
     */
    if (!trocoPara.trim()) {
      setErro('')

      return true
    }

    const trocoNumerico =
      converterNumero(
        trocoPara,
      )

    if (
      trocoNumerico === null
    ) {
      setErro(
        'Informe um valor válido para o troco.',
      )

      return false
    }

    /*
     * Quando a entrega possui frete
     * "A combinar", ainda não sabemos
     * o valor final da entrega.
     *
     * Portanto o cliente deve informar
     * dinheiro suficiente para pagar
     * pelo menos os produtos.
     *
     * Na retirada, o total é conhecido.
     */
    const valorMinimoTroco =
      freteACombinar
        ? subtotal
        : total

    if (
      trocoNumerico <
      valorMinimoTroco
    ) {
      setErro(
        `O valor informado para o troco deve ser igual ou maior que ${formatarMoeda(
          valorMinimoTroco,
        )}.`,
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

      return
    }

    if (etapa === 3) {
      validarPagamento()
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
    numeroPedido: string,
    subtotalConfirmado: number,
    freteConfirmado: number,
    totalConfirmado: number,
    freteACombinarConfirmado: boolean,
  ): string {
    /* ===================================================
       PRODUTOS
       =================================================== */

    const linhasProdutos =
      itens.map(
        (item) => {
          const quantidade =
            Number(
              item.quantidade,
            ) || 0

          const preco =
            Number(item.price) || 0

          const valor =
            preco * quantidade

          return (
            `• ${item.name} x${quantidade} — ` +
            `${formatarMoeda(valor)}`
          )
        },
      )

    /* ===================================================
       ENDEREÇO
       =================================================== */

    const endereco =
      formaEntrega ===
      'entrega'
        ? [
            cliente.rua,

            `Nº ${cliente.numero}`,

            cliente.complemento
              ? `Compl.: ${cliente.complemento}`
              : '',

            cliente.bairro,

            cliente.uf
              ? `${cliente.cidade} - ${cliente.uf}`
              : cliente.cidade,

            `CEP: ${cliente.cep}`,

            cliente.referencia
              ? `Referência: ${cliente.referencia}`
              : '',
          ]
            .filter(Boolean)
            .join(', ')
        : 'Retirada na loja'

    /* ===================================================
       PAGAMENTO
       =================================================== */

    const pagamento =
      formaPagamento === 'pix'
        ? 'Pix'
        : formaPagamento ===
            'dinheiro'
          ? (() => {
              const troco =
                converterNumero(
                  trocoPara,
                )

              if (
                troco !== null
              ) {
                return `Dinheiro — troco para ${formatarMoeda(
                  troco,
                )}`
              }

              return 'Dinheiro'
            })()
          : 'Cartão'

    /* ===================================================
       FRETE
       =================================================== */

    const mensagemFrete =
      freteACombinarConfirmado
        ? 'A combinar'
        : formatarMoeda(
            freteConfirmado,
          )

    /* ===================================================
       TOTAL
       =================================================== */

    const mensagemTotal =
      freteACombinarConfirmado
        ? `*TOTAL DOS PRODUTOS: ${formatarMoeda(
            subtotalConfirmado,
          )}*`
        : `*TOTAL: ${formatarMoeda(
            totalConfirmado,
          )}*`

    /* ===================================================
       MENSAGEM
       =================================================== */

    const mensagem = [
      `${ICONES_WHATSAPP.cachorro} *BELO CÃO — NOVO PEDIDO*`,

      '',

      `${ICONES_WHATSAPP.pedido} *Pedido:* ${numeroPedido}`,

      '',

      `${ICONES_WHATSAPP.cliente} *Cliente:* ${cliente.nome}`,

      `${ICONES_WHATSAPP.whatsapp} *WhatsApp:* ${cliente.whatsapp}`,

      '',

      `${ICONES_WHATSAPP.sacola} *ITENS DO PEDIDO*`,

      ...linhasProdutos,

      '',

      `${ICONES_WHATSAPP.entrega} *ENTREGA:* ${
        formaEntrega ===
        'entrega'
          ? 'Entrega'
          : 'Retirada na loja'
      }`,

      `${ICONES_WHATSAPP.local} *Endereço:* ${endereco}`,

      '',

      `${ICONES_WHATSAPP.pagamento} *Pagamento:* ${pagamento}`,

      '',

      `Subtotal: ${formatarMoeda(
        subtotalConfirmado,
      )}`,

      `Frete: ${mensagemFrete}`,

      mensagemTotal,

      ...(freteACombinarConfirmado
        ? [
            '',

            `${ICONES_WHATSAPP.alerta} *O valor do frete será combinado posteriormente pelo WhatsApp.*`,
          ]
        : []),

      '',

      `Obrigado por comprar na Belo Cão! ${ICONES_WHATSAPP.patas}`,
    ].join('\n')

    return mensagem
  }

  /* =======================================================
     ENVIAR PEDIDO
     ======================================================= */

  async function enviarPedido() {
    if (enviando) {
      return
    }

    if (
      pedidoFinalizadoRef.current
    ) {
      return
    }

    /* ===================================================
       VALIDAR CARRINHO
       =================================================== */

    if (!itens.length) {
      setErro(
        'Seu carrinho está vazio.',
      )

      return
    }

    /* ===================================================
       VALIDAR CLIENTE
       =================================================== */

    if (!validarEtapa1()) {
      setEtapa(1)

      return
    }

    /* ===================================================
       VALIDAR ENTREGA
       =================================================== */

    if (!validarEtapa2()) {
      setEtapa(2)

      return
    }

    /* ===================================================
       VALIDAR PAGAMENTO
       =================================================== */

    if (!validarPagamento()) {
      setEtapa(3)

      return
    }

    const whatsapp =
      normalizarWhatsApp(
        cliente.whatsapp,
      )

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
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
         ITENS
         ================================================= */

      const itensPedido =
        itens.map((item) => ({
          id: item.id,

          quantidade:
            Number(
              item.quantidade,
            ) || 0,
        }))

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
         TROCO
         ================================================= */

      const trocoNumerico =
        formaPagamento ===
        'dinheiro'
          ? converterNumero(
              trocoPara,
            )
          : null

      /* =================================================
         PAYLOAD
         =================================================

         IMPORTANTE:

         - NÃO enviamos uf.
         - NÃO enviamos total.
         - NÃO enviamos pedidoId.
         - NÃO enviamos order_number.

         O backend é a autoridade dos valores.
         ================================================= */

      const payload = {
        cliente: {
          nome:
            cliente.nome.trim(),

          whatsapp,

          cep:
            formaEntrega ===
            'entrega'
              ? cliente.cep.trim()
              : '',

          rua:
            formaEntrega ===
            'entrega'
              ? cliente.rua.trim()
              : '',

          numero:
            formaEntrega ===
            'entrega'
              ? cliente.numero.trim()
              : '',

          complemento:
            formaEntrega ===
            'entrega'
              ? cliente.complemento.trim()
              : '',

          bairro:
            formaEntrega ===
            'entrega'
              ? cliente.bairro.trim()
              : '',

          cidade:
            formaEntrega ===
            'entrega'
              ? cliente.cidade.trim()
              : '',

          referencia:
            formaEntrega ===
            'entrega'
              ? cliente.referencia.trim()
              : '',
        },

        formaEntrega,

        formaPagamento,

        trocoPara:
          trocoNumerico,

        itens: itensPedido,

        /*
         * ENTREGA:
         * null = frete a combinar.
         *
         * RETIRADA:
         * 0 = sem frete.
         */
        frete:
          formaEntrega ===
          'entrega'
            ? null
            : 0,
      }

      /* =================================================
         CRIAR PEDIDO
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
         CONFLITO / ESTOQUE
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
         OUTROS ERROS
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
         UUID INTERNO
         ================================================= */

      const pedidoId =
        dados.pedidoId ||
        dados.pedido?.id

      if (!pedidoId) {
        throw new Error(
          'O pedido foi criado, mas a API não retornou o identificador interno.',
        )
      }

      /* =================================================
         NÚMERO SEQUENCIAL
         ================================================= */

      const orderNumber =
        dados.pedido?.orderNumber ??
        dados.pedido?.order_number ??
        dados.orderNumber ??
        dados.order_number

      let numeroPedido =
        dados.pedido?.numeroPedido ||
        dados.numeroPedido ||
        ''

      if (!numeroPedido) {
        numeroPedido =
          formatarNumeroPedido(
            orderNumber,
          )
      }

      /*
       * Nunca usamos o UUID como número
       * do pedido.
       */

      if (!numeroPedido) {
        throw new Error(
          'O pedido foi criado, mas a API não retornou o número sequencial do pedido.',
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
         FRETE A COMBINAR
         ================================================= */

      const freteACombinarConfirmado =
        dados.pedido
          ?.freteACombinar ??
        dados.freteACombinar ??
        formaEntrega ===
          'entrega'

      /* =================================================
         MONTAR WHATSAPP
         ================================================= */

      const mensagem =
        criarMensagemWhatsApp(
          numeroPedido,
          subtotalConfirmado,
          freteConfirmado,
          totalConfirmado,
          freteACombinarConfirmado,
        )

      /* =================================================
         URL WHATSAPP
         ================================================= */

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

      /* =================================================
         MARCAR FINALIZADO
         ================================================= */

      pedidoFinalizadoRef.current =
        true

      setEnviando(false)

      /* =================================================
         SALVAR WHATSAPP
         ================================================= */

      try {
        window.localStorage.setItem(
          STORAGE_WHATSAPP,
          whatsapp,
        )
      } catch (error) {
        console.warn(
          'Não foi possível salvar o WhatsApp:',
          error,
        )
      }

      /* =================================================
         FINALIZAR CHECKOUT
         ================================================= */

      onPedidoFinalizado?.()

      /* =================================================
         WHATSAPP BLOQUEADO
         ================================================= */

      if (!janela) {
        console.warn(
          'O navegador bloqueou a abertura do WhatsApp.',
        )
      }

      return
    } catch (error) {
      console.error(
        'Erro ao finalizar pedido:',
        error,
      )

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
            className={
              styles.headerInfo
            }
          >
            <span
              className={
                styles.headerEyebrow
              }
            >
              BELO CÃO
            </span>

            <h1
              className={
                styles.title
              }
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
            className={
              styles.progress
            }
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
                          event.target
                            .value,
                        )
                      }
                      placeholder="(00) 00000-0000"
                      autoComplete="tel"
                    />

                    {buscandoCliente && (
                      <Loader2
                        size={17}
                        className={
                          styles.spin
                        }
                      />
                    )}
                  </div>

                  <small>
                    Usaremos este número
                    para localizar seu
                    cadastro e confirmar
                    seu pedido.
                  </small>
                </div>

                {clienteEncontrado && (
                  <div
                    className={
                      styles.pickupBox
                    }
                  >
                    <Check
                      size={20}
                    />

                    <div>
                      <strong>
                        Cadastro encontrado
                      </strong>

                      <p>
                        Encontramos seus
                        dados. Eles foram
                        preenchidos
                        automaticamente.
                      </p>
                    </div>
                  </div>
                )}

                {clienteConsultado &&
                  !clienteEncontrado &&
                  !buscandoCliente && (
                    <div
                      className={
                        styles.pickupBox
                      }
                    >
                      <User
                        size={20}
                      />

                      <div>
                        <strong>
                          Primeiro pedido?
                        </strong>

                        <p>
                          Não encontramos
                          um cadastro com
                          este WhatsApp.
                          Preencha seus
                          dados normalmente.
                        </p>
                      </div>
                    </div>
                  )}
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
                              event.target.value
                                .toUpperCase()
                                .replace(
                                  /[^A-Z]/g,
                                  '',
                                )
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
                              event.target
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

              {/* =========================================
                  TROCO
                  ========================================= */}

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
                    ) => {
                      setTrocoPara(
                        formatarTroco(
                          event
                            .target
                            .value,
                        ),
                      )

                      /*
                       * Remove erro antigo
                       * enquanto o usuário
                       * corrige o campo.
                       */
                      if (erro) {
                        setErro('')
                      }
                    }}
                    placeholder="Ex.: 100,00"
                    autoComplete="off"
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
                      {freteACombinar
                        ? 'A combinar'
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
                      {freteACombinar
                        ? 'Total dos produtos'
                        : 'Total'}
                    </span>

                    <strong>
                      {formatarMoeda(
                        total,
                      )}
                    </strong>
                  </div>

                  {freteACombinar && (
                    <div
                      className={
                        styles.shippingNotice
                      }
                    >
                      O valor do frete
                      será combinado
                      posteriormente
                      pelo WhatsApp.
                    </div>
                  )}
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
              disabled={
                enviando ||
                buscandoCliente
              }
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
                enviando
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