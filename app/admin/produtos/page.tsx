'use client'

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react'

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import styles from './Produtos.module.css'

/* =========================================================
   TIPOS
   ========================================================= */

type Produto = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string | null
  stock: number
  active: boolean
  created_at?: string
  updated_at: string
}

type ProdutoApi = {
  id: string | number | null | undefined
  name?: string | null
  description?: string | null
  price?: number | string | null
  category?: string | null
  image_url?: string | null
  stock?: number | string | null
  active?: boolean | string | number | null
  created_at?: string | null
  updated_at?: string | null
}

type FormProduto = {
  id?: string
  name: string
  description: string
  price: string
  category: string
  image_url: string
  stock: string
  active: boolean
}

type MovimentoEstoque = {
  id: string
  tipo: 'entrada' | 'saida'
  quantidade: string
}

type Toast = {
  tipo: 'sucesso' | 'erro'
  mensagem: string
}

/* =========================================================
   CONSTANTES
   ========================================================= */

const CATEGORIAS = [
  'Geral',
  'Alimentação',
  'Petiscos',
  'Higiene',
  'Saúde',
  'Acessórios',
  'Brinquedos',
  'Cães',
  'Gatos',
  'Outros',
]

const ESTOQUE_BAIXO = 5

const FORM_INICIAL: FormProduto = {
  name: '',
  description: '',
  price: '',
  category: 'Geral',
  image_url: '',
  stock: '0',
  active: true,
}

/* =========================================================
   HELPERS
   ========================================================= */

function idSeguro(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const id = String(value).trim()

  return id || null
}

/**
 * Converte valores vindos do banco sem alterar
 * a escala monetária.
 *
 * Exemplos:
 * 16.90   -> 16.90
 * "16.90" -> 16.90
 * "16,90" -> 16.90
 * 6490    -> 6490
 */
function numeroSeguro(
  value: unknown,
): number {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : 0
  }

  if (typeof value === 'string') {
    const texto = value.trim()

    if (!texto) {
      return 0
    }

    /*
     * Trata formatos:
     * 16.90
     * 16,90
     * 1.690,90
     * 6490.00
     */
    let normalizado = texto
      .replace(/\s/g, '')

    if (
      normalizado.includes(',') &&
      normalizado.includes('.')
    ) {
      /*
       * Exemplo:
       * 1.690,90
       * vira
       * 1690.90
       */
      normalizado = normalizado
        .replace(/\./g, '')
        .replace(',', '.')
    } else if (
      normalizado.includes(',')
    ) {
      /*
       * Exemplo:
       * 16,90
       */
      normalizado =
        normalizado.replace(
          ',',
          '.',
        )
    }

    const numero = Number(
      normalizado,
    )

    return Number.isFinite(numero)
      ? numero
      : 0
  }

  return 0
}

function booleanoSeguro(
  value: unknown,
): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const texto = value
      .trim()
      .toLowerCase()

    if (
      texto === 'false' ||
      texto === '0' ||
      texto === 'off' ||
      texto === 'no'
    ) {
      return false
    }

    if (
      texto === 'true' ||
      texto === '1' ||
      texto === 'on' ||
      texto === 'yes'
    ) {
      return true
    }
  }

  return false
}

/* =========================================================
   FORMATAÇÃO DE PREÇO
   ========================================================= */

function formatarPreco(
  valor: number,
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(valor)
}

/**
 * Formata o campo de preço enquanto o usuário digita.
 *
 * Exemplos:
 *
 * 1       -> 0,01
 * 10      -> 0,10
 * 100     -> 1,00
 * 1690    -> 16,90
 * 8990    -> 89,90
 * 649000  -> 6.490,00
 *
 * O banco continua recebendo:
 *
 * 16.90
 * 89.90
 * 6490.00
 */
function formatarPrecoInput(
  valor: string,
): string {
  const somenteNumeros =
    valor.replace(/\D/g, '')

  if (!somenteNumeros) {
    return ''
  }

  /*
   * Limite de segurança.
   * Evita valores absurdamente grandes.
   */
  const limitado =
    somenteNumeros.slice(0, 12)

  const numero =
    Number(limitado) / 100

  if (!Number.isFinite(numero)) {
    return ''
  }

  return numero.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )
}

/**
 * Converte o valor visual:
 *
 * 16,90 -> 16.90
 * 89,90 -> 89.90
 * 6.490,00 -> 6490.00
 */
function converterPrecoParaNumero(
  valor: string,
): number {
  const texto = valor
    .trim()
    .replace(/\s/g, '')

  if (!texto) {
    return NaN
  }

  const normalizado = texto
    .replace(/\./g, '')
    .replace(',', '.')

  const numero =
    Number(normalizado)

  return Number.isFinite(numero)
    ? numero
    : NaN
}

/**
 * Ao editar um produto, transforma:
 *
 * 16.9  -> 16,90
 * 89.9  -> 89,90
 * 6490  -> 6.490,00
 */
function precoParaFormulario(
  valor: number,
): string {
  if (
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return ''
  }

  return valor.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )
}

/* =========================================================
   DATA
   ========================================================= */

function formatarData(
  valor?: string,
): string {
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(data)
}

/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */

function normalizarProduto(
  produto: ProdutoApi,
): Produto | null {
  const id = idSeguro(
    produto.id,
  )

  if (!id) {
    return null
  }

  const imageUrl =
    produto.image_url
      ? String(
          produto.image_url,
        ).trim()
      : null

  return {
    id,

    name: String(
      produto.name ?? '',
    ).trim(),

    description: String(
      produto.description ?? '',
    ).trim(),

    /*
     * IMPORTANTE:
     * NÃO multiplica nem divide por 100.
     */
    price: numeroSeguro(
      produto.price,
    ),

    category:
      String(
        produto.category ??
          'Geral',
      ).trim() || 'Geral',

    image_url:
      imageUrl || null,

    stock: Math.max(
      0,
      Math.floor(
        numeroSeguro(
          produto.stock,
        ),
      ),
    ),

    active:
      booleanoSeguro(
        produto.active,
      ),

    created_at:
      produto.created_at ??
      undefined,

    updated_at:
      produto.updated_at ?? '',
  }
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function ProdutosAdminPage() {
  const [
    produtos,
    setProdutos,
  ] = useState<Produto[]>([])

  const [
    carregando,
    setCarregando,
  ] = useState(true)

  const [
    salvando,
    setSalvando,
  ] = useState(false)

  const [
    enviandoImagem,
    setEnviandoImagem,
  ] = useState(false)

  const [
    erro,
    setErro,
  ] = useState('')

  const [
    busca,
    setBusca,
  ] = useState('')

  const [
    categoriaFiltro,
    setCategoriaFiltro,
  ] = useState('todas')

  const [
    statusFiltro,
    setStatusFiltro,
  ] = useState('todos')

  const [
    modalProduto,
    setModalProduto,
  ] = useState(false)

  const [
    modalEstoque,
    setModalEstoque,
  ] = useState(false)

  const [
    produtoSelecionado,
    setProdutoSelecionado,
  ] = useState<Produto | null>(
    null,
  )

  const [
    editando,
    setEditando,
  ] = useState(false)

  const [
    formulario,
    setFormulario,
  ] = useState<FormProduto>(
    FORM_INICIAL,
  )

  const [
    movimento,
    setMovimento,
  ] = useState<MovimentoEstoque>(
    {
      id: '',
      tipo: 'entrada',
      quantidade: '1',
    },
  )

  const [
    toast,
    setToast,
  ] = useState<Toast | null>(
    null,
  )

  const [
    imagensComErro,
    setImagensComErro,
  ] = useState<
    Record<string, boolean>
  >({})

  const [
    erroPreview,
    setErroPreview,
  ] = useState(false)

  const inputImagemRef =
    useRef<HTMLInputElement>(
      null,
    )

  /* =======================================================
     TOAST
     ======================================================= */

  const mostrarToast =
    useCallback(
      (
        tipo:
          | 'sucesso'
          | 'erro',
        mensagem: string,
      ) => {
        setToast({
          tipo,
          mensagem,
        })

        window.setTimeout(
          () => {
            setToast(null)
          },
          3500,
        )
      },
      [],
    )

  /* =======================================================
     CARREGAR PRODUTOS
     ======================================================= */

  const carregarProdutos =
    useCallback(
      async () => {
        try {
          setCarregando(true)
          setErro('')

          const resposta =
            await fetch(
              '/api/admin/produtos',
              {
                method: 'GET',
                cache: 'no-store',
              },
            )

          const dados =
            await resposta.json()

          if (!resposta.ok) {
            throw new Error(
              dados?.error ||
                'Não foi possível carregar os produtos.',
            )
          }

          if (
            !Array.isArray(
              dados,
            )
          ) {
            throw new Error(
              'A API retornou um formato inválido.',
            )
          }

          const ids =
            new Set<string>()

          const normalizados =
            dados
              .map(
                (produto) =>
                  normalizarProduto(
                    produto,
                  ),
              )
              .filter(
                (
                  produto,
                ): produto is Produto => {
                  if (!produto) {
                    return false
                  }

                  if (
                    ids.has(
                      produto.id,
                    )
                  ) {
                    console.warn(
                      'Produto duplicado ignorado:',
                      produto.id,
                    )

                    return false
                  }

                  ids.add(
                    produto.id,
                  )

                  return true
                },
              )

          setProdutos(
            normalizados,
          )
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : 'Erro ao carregar produtos.'

          setErro(mensagem)

          mostrarToast(
            'erro',
            mensagem,
          )
        } finally {
          setCarregando(
            false,
          )
        }
      },
      [mostrarToast],
    )

  useEffect(() => {
    carregarProdutos()
  }, [carregarProdutos])

  /* =======================================================
     FILTROS
     ======================================================= */

  const categoriasDisponiveis =
    useMemo(() => {
      const categorias =
        new Set<string>()

      produtos.forEach(
        (produto) => {
          if (
            produto.category
          ) {
            categorias.add(
              produto.category,
            )
          }
        },
      )

      return Array.from(
        categorias,
      ).sort((a, b) =>
        a.localeCompare(
          b,
          'pt-BR',
        ),
      )
    }, [produtos])

  const produtosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase()

      return produtos.filter(
        (produto) => {
          const correspondeBusca =
            !termo ||
            produto.name
              .toLowerCase()
              .includes(termo) ||
            produto.category
              .toLowerCase()
              .includes(termo) ||
            produto.description
              .toLowerCase()
              .includes(termo)

          const correspondeCategoria =
            categoriaFiltro ===
              'todas' ||
            produto.category ===
              categoriaFiltro

          const correspondeStatus =
            statusFiltro ===
              'todos' ||
            (statusFiltro ===
              'ativos' &&
              produto.active) ||
            (statusFiltro ===
              'inativos' &&
              !produto.active) ||
            (statusFiltro ===
              'baixo' &&
              produto.stock <=
                ESTOQUE_BAIXO)

          return (
            correspondeBusca &&
            correspondeCategoria &&
            correspondeStatus
          )
        },
      )
    }, [
      produtos,
      busca,
      categoriaFiltro,
      statusFiltro,
    ])

  /* =======================================================
     MÉTRICAS
     ======================================================= */

  const metricas =
    useMemo(() => {
      const total =
        produtos.length

      const ativos =
        produtos.filter(
          (produto) =>
            produto.active,
        ).length

      const estoqueBaixo =
        produtos.filter(
          (produto) =>
            produto.stock <=
            ESTOQUE_BAIXO,
        ).length

      /*
       * IMPORTANTE:
       *
       * preço × estoque
       *
       * sem × 100
       * sem ÷ 100
       */
      const valorEstoque =
        produtos.reduce(
          (
            total,
            produto,
          ) =>
            total +
            produto.price *
              produto.stock,
          0,
        )

      return {
        total,
        ativos,
        estoqueBaixo,
        valorEstoque,
      }
    }, [produtos])

  /* =======================================================
     NOVO PRODUTO
     ======================================================= */

  function abrirNovoProduto() {
    setEditando(false)
    setProdutoSelecionado(
      null,
    )
    setErroPreview(false)
    setFormulario({
      ...FORM_INICIAL,
    })
    setModalProduto(true)
  }

  /* =======================================================
     EDITAR
     ======================================================= */

  function abrirEdicao(
    produto: Produto,
  ) {
    setEditando(true)

    setProdutoSelecionado(
      produto,
    )

    setErroPreview(false)

    setFormulario({
      id: produto.id,

      name: produto.name,

      description:
        produto.description,

      /*
       * Exemplo:
       * 16.9 -> 16,90
       * 6490 -> 6.490,00
       */
      price:
        precoParaFormulario(
          produto.price,
        ),

      category:
        produto.category ||
        'Geral',

      image_url:
        produto.image_url ||
        '',

      stock:
        String(
          produto.stock,
        ),

      active:
        produto.active,
    })

    setModalProduto(true)
  }

  function fecharModalProduto() {
    if (
      salvando ||
      enviandoImagem
    ) {
      return
    }

    setModalProduto(false)

    setProdutoSelecionado(
      null,
    )

    setErroPreview(false)

    setFormulario({
      ...FORM_INICIAL,
    })

    if (
      inputImagemRef.current
    ) {
      inputImagemRef.current.value =
        ''
    }
  }

  /* =======================================================
     FORM
     ======================================================= */

  function atualizarCampo(
    campo: keyof FormProduto,
    valor:
      | string
      | boolean,
  ) {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      }),
    )
  }

  /* =======================================================
     PREÇO
     ======================================================= */

  function atualizarPreco(
    valor: string,
  ) {
    const formatado =
      formatarPrecoInput(
        valor,
      )

    atualizarCampo(
      'price',
      formatado,
    )
  }

  /* =======================================================
     IMAGEM URL
     ======================================================= */

  function validarImagemUrl(
    url: string,
  ) {
    if (!url.trim()) {
      return true
    }

    try {
      const parsed =
        new URL(url)

      return (
        parsed.protocol ===
          'http:' ||
        parsed.protocol ===
          'https:'
      )
    } catch {
      return false
    }
  }

  function alterarImagemUrl(
    valor: string,
  ) {
    setErroPreview(false)

    atualizarCampo(
      'image_url',
      valor,
    )
  }

  /* =======================================================
     UPLOAD CLOUDINARY
     ======================================================= */

  async function enviarImagem(
    arquivo: File,
  ) {
    try {
      setEnviandoImagem(true)

      if (
        !arquivo.type.startsWith(
          'image/',
        )
      ) {
        throw new Error(
          'Selecione um arquivo de imagem.',
        )
      }

      if (
        arquivo.size >
        5 * 1024 * 1024
      ) {
        throw new Error(
          'A imagem deve ter no máximo 5 MB.',
        )
      }

      const cloudName =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

      const uploadPreset =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

      if (
        !cloudName ||
        !uploadPreset
      ) {
        throw new Error(
          'Cloudinary não configurado. Verifique o .env.local.',
        )
      }

      const dados =
        new FormData()

      dados.append(
        'file',
        arquivo,
      )

      dados.append(
        'upload_preset',
        uploadPreset,
      )

      dados.append(
        'folder',
        'belo-cao/produtos',
      )

      const resposta =
        await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: dados,
          },
        )

      const resultado =
        await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          resultado?.error
            ?.message ||
            'Não foi possível enviar a imagem.',
        )
      }

      if (
        !resultado?.secure_url
      ) {
        throw new Error(
          'O Cloudinary não retornou a URL da imagem.',
        )
      }

      setErroPreview(false)

      atualizarCampo(
        'image_url',
        resultado.secure_url,
      )

      mostrarToast(
        'sucesso',
        'Imagem enviada com sucesso.',
      )
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Erro ao enviar imagem.'

      mostrarToast(
        'erro',
        mensagem,
      )
    } finally {
      setEnviandoImagem(
        false,
      )

      if (
        inputImagemRef.current
      ) {
        inputImagemRef.current.value =
          ''
      }
    }
  }

  function selecionarImagem(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const arquivo =
      event.target.files?.[0]

    if (!arquivo) {
      return
    }

    enviarImagem(
      arquivo,
    )
  }

  function removerImagem() {
    setErroPreview(false)

    atualizarCampo(
      'image_url',
      '',
    )
  }

  /* =======================================================
     SALVAR PRODUTO
     ======================================================= */

  async function salvarProduto(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (salvando) {
      return
    }

    const nome =
      formulario.name.trim()

    if (!nome) {
      mostrarToast(
        'erro',
        'Informe o nome do produto.',
      )
      return
    }

    /*
     * Converte:
     *
     * 16,90 -> 16.90
     * 89,90 -> 89.90
     * 6.490,00 -> 6490
     */
    const preco =
      converterPrecoParaNumero(
        formulario.price,
      )

    const estoque =
      Number(
        formulario.stock,
      )

    if (
      !Number.isFinite(
        preco,
      ) ||
      preco < 0
    ) {
      mostrarToast(
        'erro',
        'Informe um preço válido.',
      )
      return
    }

    if (
      !Number.isInteger(
        estoque,
      ) ||
      estoque < 0
    ) {
      mostrarToast(
        'erro',
        'Informe um estoque válido.',
      )
      return
    }

    const categoria =
      formulario.category.trim()

    if (!categoria) {
      mostrarToast(
        'erro',
        'Selecione uma categoria.',
      )
      return
    }

    if (
      !validarImagemUrl(
        formulario.image_url,
      )
    ) {
      mostrarToast(
        'erro',
        'A URL da imagem é inválida.',
      )
      return
    }

    try {
      setSalvando(true)

      const payload = {
        id: formulario.id,

        name: nome,

        description:
          formulario.description.trim(),

        /*
         * ENVIA O VALOR EM REAIS.
         *
         * 16,90 -> 16.9
         * 6490,00 -> 6490
         *
         * Não existe ×100 aqui.
         */
        price: preco,

        category:
          categoria || 'Geral',

        image_url:
          formulario.image_url.trim() ||
          null,

        stock: estoque,

        active:
          formulario.active,
      }

      const resposta =
        await fetch(
          '/api/admin/produtos',
          {
            method: editando
              ? 'PATCH'
              : 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              payload,
            ),
          },
        )

      const resultado =
        await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
            'Não foi possível salvar o produto.',
        )
      }

      const produto =
        normalizarProduto(
          resultado,
        )

      if (produto) {
        setProdutos(
          (anterior) => {
            if (editando) {
              return anterior.map(
                (item) =>
                  item.id ===
                  produto.id
                    ? produto
                    : item,
              )
            }

            return [
              produto,
              ...anterior,
            ]
          },
        )
      } else {
        await carregarProdutos()
      }

      fecharModalProduto()

      mostrarToast(
        'sucesso',
        editando
          ? 'Produto atualizado com sucesso.'
          : 'Produto criado com sucesso.',
      )
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Erro ao salvar produto.'

      mostrarToast(
        'erro',
        mensagem,
      )
    } finally {
      setSalvando(false)
    }
  }

  /* =======================================================
     ESTOQUE
     ======================================================= */

  function abrirEstoque(
    produto: Produto,
  ) {
    setProdutoSelecionado(
      produto,
    )

    setMovimento({
      id: produto.id,
      tipo: 'entrada',
      quantidade: '1',
    })

    setModalEstoque(true)
  }

  function fecharEstoque() {
    if (salvando) {
      return
    }

    setModalEstoque(false)

    setProdutoSelecionado(
      null,
    )
  }

  async function movimentarEstoque(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (salvando) {
      return
    }

    const quantidade =
      Number(
        movimento.quantidade,
      )

    if (
      !Number.isInteger(
        quantidade,
      ) ||
      quantidade <= 0
    ) {
      mostrarToast(
        'erro',
        'Informe uma quantidade válida.',
      )
      return
    }

    if (!movimento.id) {
      mostrarToast(
        'erro',
        'Produto inválido.',
      )
      return
    }

    try {
      setSalvando(true)

      const resposta =
        await fetch(
          '/api/admin/produtos/estoque',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: movimento.id,
              tipo: movimento.tipo,
              quantidade,
            }),
          },
        )

      const resultado =
        await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
            'Não foi possível movimentar o estoque.',
        )
      }

      await carregarProdutos()

      fecharEstoque()

      mostrarToast(
        'sucesso',
        movimento.tipo ===
          'entrada'
          ? 'Entrada registrada.'
          : 'Saída registrada.',
      )
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Erro ao movimentar estoque.'

      mostrarToast(
        'erro',
        mensagem,
      )
    } finally {
      setSalvando(false)
    }
  }

  /* =======================================================
     PREVIEW
     ======================================================= */

  const imagemPreview =
    formulario.image_url.trim()

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main
      className={
        styles.container
      }
    >
      {/* ===================================================
          HEADER
          =================================================== */}

      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.headerLeft
          }
        >
          <button
            type="button"
            className={
              styles.backButton
            }
            onClick={() => {
              window.history.back()
            }}
            aria-label="Voltar"
          >
            <ArrowLeft
              size={19}
            />
          </button>

          <div>
            <div
              className={
                styles.eyebrow
              }
            >
              BELO CÃO
            </div>

            <h1>
              Produtos
            </h1>

            <p>
              Gerencie catálogo,
              estoque e imagens
              dos produtos.
            </p>
          </div>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={
              carregarProdutos
            }
            disabled={
              carregando
            }
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
            className={
              styles.primaryButton
            }
            onClick={
              abrirNovoProduto
            }
          >
            <Plus size={18} />

            Novo produto
          </button>
        </div>
      </header>

      {/* ===================================================
          MÉTRICAS
          =================================================== */}

      <section
        className={
          styles.metrics
        }
      >
        <article
          className={
            styles.metricCard
          }
        >
          <div
            className={
              styles.metricIcon
            }
          >
            <ShoppingBag
              size={20}
            />
          </div>

          <div>
            <span>
              Produtos
            </span>

            <strong>
              {metricas.total}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.metricCard
          }
        >
          <div
            className={
              styles.metricIcon
            }
          >
            <Check size={20} />
          </div>

          <div>
            <span>
              Ativos
            </span>

            <strong>
              {metricas.ativos}
            </strong>
          </div>
        </article>

        <article
          className={`${styles.metricCard} ${
            metricas.estoqueBaixo >
            0
              ? styles.metricWarning
              : ''
          }`}
        >
          <div
            className={
              styles.metricIcon
            }
          >
            <TrendingDown
              size={20}
            />
          </div>

          <div>
            <span>
              Estoque baixo
            </span>

            <strong>
              {
                metricas.estoqueBaixo
              }
            </strong>
          </div>
        </article>

        <article
          className={
            styles.metricCard
          }
        >
          <div
            className={
              styles.metricIcon
            }
          >
            <TrendingUp
              size={20}
            />
          </div>

          <div>
            <span>
              Valor em estoque
            </span>

            <strong>
              {formatarPreco(
                metricas.valorEstoque,
              )}
            </strong>
          </div>
        </article>
      </section>

      {/* ===================================================
          FILTROS
          =================================================== */}

      <section
        className={
          styles.toolbar
        }
      >
        <div
          className={
            styles.searchBox
          }
        >
          <Search size={18} />

          <input
            type="search"
            value={busca}
            onChange={(event) =>
              setBusca(
                event.target.value,
              )
            }
            placeholder="Buscar produto..."
          />

          {busca && (
            <button
              type="button"
              onClick={() =>
                setBusca('')
              }
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div
          className={
            styles.selectWrap
          }
        >
          <select
            value={
              categoriaFiltro
            }
            onChange={(event) =>
              setCategoriaFiltro(
                event.target.value,
              )
            }
          >
            <option value="todas">
              Todas as categorias
            </option>

            {categoriasDisponiveis.map(
              (categoria) => (
                <option
                  key={categoria}
                  value={categoria}
                >
                  {categoria}
                </option>
              ),
            )}
          </select>

          <ChevronDown
            size={16}
          />
        </div>

        <div
          className={
            styles.selectWrap
          }
        >
          <select
            value={
              statusFiltro
            }
            onChange={(event) =>
              setStatusFiltro(
                event.target.value,
              )
            }
          >
            <option value="todos">
              Todos
            </option>

            <option value="ativos">
              Ativos
            </option>

            <option value="inativos">
              Inativos
            </option>

            <option value="baixo">
              Estoque baixo
            </option>
          </select>

          <ChevronDown
            size={16}
          />
        </div>

        <span
          className={
            styles.resultCount
          }
        >
          {produtosFiltrados.length}{' '}
          resultado
          {produtosFiltrados.length !==
          1
            ? 's'
            : ''}
        </span>
      </section>

      {/* ===================================================
          ERRO
          =================================================== */}

      {erro && (
        <div
          className={
            styles.errorBanner
          }
        >
          <AlertTriangle
            size={18}
          />

          <span>
            {erro}
          </span>

          <button
            type="button"
            onClick={
              carregarProdutos
            }
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ===================================================
          LISTA
          =================================================== */}

      <section
        className={
          styles.lista
        }
      >
        {carregando ? (
          <div
            className={
              styles.loading
            }
          >
            <Loader2
              size={28}
              className={
                styles.spin
              }
            />

            <span>
              Carregando produtos...
            </span>
          </div>
        ) : produtosFiltrados.length ===
          0 ? (
          <div
            className={
              styles.empty
            }
          >
            <div
              className={
                styles.emptyIcon
              }
            >
              <Package
                size={28}
              />
            </div>

            <h2>
              Nenhum produto
              encontrado
            </h2>

            <p>
              Tente alterar os
              filtros ou cadastre
              um novo produto.
            </p>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={
                abrirNovoProduto
              }
            >
              <Plus size={18} />

              Novo produto
            </button>
          </div>
        ) : (
          <div
            className={
              styles.produtos
            }
          >
            {produtosFiltrados.map(
              (produto) => {
                const imagemValida =
                  Boolean(
                    produto.image_url &&
                      !imagensComErro[
                        produto.id
                      ],
                  )

                const estoqueBaixo =
                  produto.stock <=
                  ESTOQUE_BAIXO

                return (
                  <article
                    key={
                      produto.id
                    }
                    className={
                      styles.produto
                    }
                  >
                    {/* IMAGEM */}

                    <div
                      className={
                        styles.produtoImagem
                      }
                    >
                      {imagemValida ? (
                        <img
                          src={
                            produto.image_url ||
                            ''
                          }
                          alt={
                            produto.name
                          }
                          loading="lazy"
                          onError={() =>
                            setImagensComErro(
                              (
                                anterior,
                              ) => ({
                                ...anterior,
                                [produto.id]:
                                  true,
                              }),
                            )
                          }
                        />
                      ) : (
                        <div
                          className={
                            styles.imagemFallback
                          }
                        >
                          <ImageIcon
                            size={24}
                          />
                        </div>
                      )}

                      {produto.active && (
                        <span
                          className={
                            styles.statusDot
                          }
                          title="Produto ativo"
                        />
                      )}
                    </div>

                    {/* INFORMAÇÕES */}

                    <div
                      className={
                        styles.produtoInfo
                      }
                    >
                      <div
                        className={
                          styles.produtoTop
                        }
                      >
                        <span
                          className={
                            styles.categoria
                          }
                        >
                          {
                            produto.category
                          }
                        </span>

                        <span
                          className={
                            produto.active
                              ? styles.ativo
                              : styles.inativo
                          }
                        >
                          {produto.active
                            ? 'Ativo'
                            : 'Inativo'}
                        </span>
                      </div>

                      <h2>
                        {produto.name}
                      </h2>

                      {produto.description && (
                        <p
                          className={
                            styles.descricao
                          }
                        >
                          {
                            produto.description
                          }
                        </p>
                      )}

                      <div
                        className={
                          styles.produtoMeta
                        }
                      >
                        <strong>
                          {formatarPreco(
                            produto.price,
                          )}
                        </strong>

                        <span
                          className={
                            estoqueBaixo
                              ? styles.estoqueBaixo
                              : styles.estoque
                          }
                        >
                          {estoqueBaixo && (
                            <AlertTriangle
                              size={
                                14
                              }
                            />
                          )}

                          Estoque:{' '}

                          {
                            produto.stock
                          }
                        </span>
                      </div>
                    </div>

                    {/* AÇÕES */}

                    <div
                      className={
                        styles.produtoActions
                      }
                    >
                      <button
                        type="button"
                        className={
                          styles.actionButton
                        }
                        onClick={() =>
                          abrirEdicao(
                            produto,
                          )
                        }
                        title="Editar produto"
                      >
                        <Edit3
                          size={17}
                        />

                        <span>
                          Editar
                        </span>
                      </button>

                      <button
                        type="button"
                        className={
                          styles.stockButton
                        }
                        onClick={() =>
                          abrirEstoque(
                            produto,
                          )
                        }
                        title="Movimentar estoque"
                      >
                        <Package
                          size={17}
                        />

                        <span>
                          Estoque
                        </span>
                      </button>
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>

      {/* ===================================================
          MODAL PRODUTO
          =================================================== */}

      {modalProduto && (
        <div
          className={
            styles.overlay
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              fecharModalProduto()
            }
          }}
        >
          <div
            className={
              styles.modal
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.modalEyebrow
                  }
                >
                  {editando
                    ? 'CATÁLOGO'
                    : 'NOVO PRODUTO'}
                </span>

                <h2>
                  {editando
                    ? 'Editar produto'
                    : 'Adicionar produto'}
                </h2>

                <p>
                  Configure as
                  informações e a
                  imagem do produto.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  fecharModalProduto
                }
                disabled={
                  salvando ||
                  enviandoImagem
                }
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={
                salvarProduto
              }
              className={
                styles.form
              }
            >
              <div
                className={
                  styles.formGrid
                }
              >
                {/* DADOS */}

                <div
                  className={
                    styles.formColumn
                  }
                >
                  <div
                    className={
                      styles.field
                    }
                  >
                    <label htmlFor="produto-name">
                      Nome do produto
                    </label>

                    <input
                      id="produto-name"
                      type="text"
                      value={
                        formulario.name
                      }
                      onChange={(
                        event,
                      ) =>
                        atualizarCampo(
                          'name',
                          event.target
                            .value,
                        )
                      }
                      placeholder="Ex.: Ração Premium"
                      maxLength={120}
                      required
                    />
                  </div>

                  <div
                    className={
                      styles.twoColumns
                    }
                  >
                    {/* PREÇO */}

                    <div
                      className={
                        styles.field
                      }
                    >
                      <label htmlFor="produto-price">
                        Preço
                      </label>

                      <div
                        className={
                          styles.inputMoney
                        }
                      >
                        <span>
                          R$
                        </span>

                        <input
                          id="produto-price"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={
                            formulario.price
                          }
                          onChange={(
                            event,
                          ) =>
                            atualizarPreco(
                              event
                                .target
                                .value,
                            )
                          }
                          onPaste={(
                            event,
                          ) => {
                            const texto =
                              event.clipboardData.getData(
                                'text',
                              )

                            if (
                              !/\d/.test(
                                texto,
                              )
                            ) {
                              event.preventDefault()
                            }
                          }}
                          placeholder="0,00"
                          maxLength={16}
                          required
                        />
                      </div>

                      <small
                        className={
                          styles.fieldHint
                        }
                      >
                        Digite somente
                        números.
                      </small>
                    </div>

                    {/* ESTOQUE */}

                    <div
                      className={
                        styles.field
                      }
                    >
                      <label htmlFor="produto-stock">
                        Estoque
                      </label>

                      <input
                        id="produto-stock"
                        type="number"
                        min="0"
                        max="999999"
                        step="1"
                        inputMode="numeric"
                        value={
                          formulario.stock
                        }
                        onChange={(
                          event,
                        ) =>
                          atualizarCampo(
                            'stock',
                            event.target
                              .value,
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* CATEGORIA */}

                  <div
                    className={
                      styles.field
                    }
                  >
                    <label htmlFor="produto-category">
                      Categoria
                    </label>

                    <div
                      className={
                        styles.selectField
                      }
                    >
                      <select
                        id="produto-category"
                        value={
                          formulario.category
                        }
                        onChange={(
                          event,
                        ) =>
                          atualizarCampo(
                            'category',
                            event.target
                              .value,
                          )
                        }
                        required
                      >
                        {CATEGORIAS.map(
                          (
                            categoria,
                          ) => (
                            <option
                              key={
                                categoria
                              }
                              value={
                                categoria
                              }
                            >
                              {
                                categoria
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={16}
                      />
                    </div>
                  </div>

                  {/* DESCRIÇÃO */}

                  <div
                    className={
                      styles.field
                    }
                  >
                    <label htmlFor="produto-description">
                      Descrição
                    </label>

                    <textarea
                      id="produto-description"
                      value={
                        formulario.description
                      }
                      onChange={(
                        event,
                      ) =>
                        atualizarCampo(
                          'description',
                          event.target
                            .value,
                        )
                      }
                      placeholder="Descrição curta do produto..."
                      rows={4}
                      maxLength={500}
                    />

                    <small
                      className={
                        styles.fieldHint
                      }
                    >
                      {
                        formulario
                          .description
                          .length
                      }
                      /500
                    </small>
                  </div>

                  {/* ATIVO */}

                  <label
                    className={
                      styles.switchRow
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        formulario.active
                      }
                      onChange={(
                        event,
                      ) =>
                        atualizarCampo(
                          'active',
                          event.target
                            .checked,
                        )
                      }
                    />

                    <span
                      className={
                        styles.switch
                      }
                    >
                      <span />
                    </span>

                    <span>
                      <strong>
                        Produto ativo
                      </strong>

                      <small>
                        Disponível para
                        venda na loja.
                      </small>
                    </span>
                  </label>
                </div>

                {/* =================================================
                    IMAGEM
                    ================================================= */}

                <div
                  className={
                    styles.imageColumn
                  }
                >
                  <div
                    className={
                      styles.imageHeader
                    }
                  >
                    <div>
                      <span>
                        IMAGEM
                      </span>

                      <strong>
                        Foto do produto
                      </strong>
                    </div>

                    {imagemPreview && (
                      <button
                        type="button"
                        className={
                          styles.removeImageButton
                        }
                        onClick={
                          removerImagem
                        }
                        disabled={
                          enviandoImagem
                        }
                      >
                        <Trash2
                          size={15}
                        />

                        Remover
                      </button>
                    )}
                  </div>

                  {/* PREVIEW */}

                  <div
                    className={
                      styles.imagePreview
                    }
                  >
                    {imagemPreview &&
                    !erroPreview ? (
                      <img
                        src={
                          imagemPreview
                        }
                        alt="Preview do produto"
                        onError={() => {
                          setErroPreview(
                            true,
                          )

                          mostrarToast(
                            'erro',
                            'Não foi possível carregar essa imagem.',
                          )
                        }}
                      />
                    ) : (
                      <div
                        className={
                          styles.previewEmpty
                        }
                      >
                        <div
                          className={
                            styles.previewIcon
                          }
                        >
                          <ImageIcon
                            size={28}
                          />
                        </div>

                        <strong>
                          {erroPreview
                            ? 'Imagem inválida'
                            : 'Nenhuma imagem'}
                        </strong>

                        <span>
                          {erroPreview
                            ? 'Verifique a URL ou escolha outra foto.'
                            : 'Adicione uma foto para destacar o produto.'}
                        </span>
                      </div>
                    )}

                    {enviandoImagem && (
                      <div
                        className={
                          styles.uploadOverlay
                        }
                      >
                        <Loader2
                          size={26}
                          className={
                            styles.spin
                          }
                        />

                        <span>
                          Enviando imagem...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* UPLOAD */}

                  <div
                    className={
                      styles.imageButtons
                    }
                  >
                    <input
                      ref={
                        inputImagemRef
                      }
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={
                        selecionarImagem
                      }
                      hidden
                    />

                    <button
                      type="button"
                      className={
                        styles.uploadButton
                      }
                      onClick={() =>
                        inputImagemRef.current?.click()
                      }
                      disabled={
                        enviandoImagem
                      }
                    >
                      {enviandoImagem ? (
                        <Loader2
                          size={17}
                          className={
                            styles.spin
                          }
                        />
                      ) : (
                        <Upload
                          size={17}
                        />
                      )}

                      {enviandoImagem
                        ? 'Enviando...'
                        : 'Escolher foto'}
                    </button>
                  </div>

                  {/* URL */}

                  <div
                    className={
                      styles.urlField
                    }
                  >
                    <div
                      className={
                        styles.urlLabel
                      }
                    >
                      <Link2
                        size={15}
                      />

                      <span>
                        Ou use uma URL
                      </span>
                    </div>

                    <input
                      type="url"
                      value={
                        formulario.image_url
                      }
                      onChange={(
                        event,
                      ) =>
                        alterarImagemUrl(
                          event.target
                            .value,
                        )
                      }
                      placeholder="https://..."
                      maxLength={1000}
                    />
                  </div>

                  {/* ABRIR */}

                  {imagemPreview &&
                    !erroPreview && (
                      <a
                        href={
                          imagemPreview
                        }
                        target="_blank"
                        rel="noreferrer"
                        className={
                          styles.openImage
                        }
                      >
                        <ExternalLink
                          size={14}
                        />

                        Abrir imagem
                      </a>
                    )}

                  <p
                    className={
                      styles.imageHint
                    }
                  >
                    JPG, PNG, WEBP ou
                    AVIF · máximo 5 MB.
                    A imagem será
                    armazenada no
                    Cloudinary.
                  </p>
                </div>
              </div>

              {/* =================================================
                  FOOTER
                  ================================================= */}

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
                  onClick={
                    fecharModalProduto
                  }
                  disabled={
                    salvando ||
                    enviandoImagem
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={
                    salvando ||
                    enviandoImagem
                  }
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
                      <Check
                        size={17}
                      />

                      {editando
                        ? 'Salvar alterações'
                        : 'Criar produto'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL ESTOQUE
          =================================================== */}

      {modalEstoque &&
        produtoSelecionado && (
          <div
            className={
              styles.overlay
            }
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                fecharEstoque()
              }
            }}
          >
            <div
              className={
                styles.stockModal
              }
            >
              <div
                className={
                  styles.modalHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.modalEyebrow
                    }
                  >
                    ESTOQUE
                  </span>

                  <h2>
                    Movimentar estoque
                  </h2>

                  <p>
                    {
                      produtoSelecionado.name
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className={
                    styles.closeButton
                  }
                  onClick={
                    fecharEstoque
                  }
                  disabled={
                    salvando
                  }
                >
                  <X size={19} />
                </button>
              </div>

              <div
                className={
                  styles.currentStock
                }
              >
                <span>
                  Estoque atual
                </span>

                <strong>
                  {
                    produtoSelecionado.stock
                  }
                </strong>

                <small>
                  unidades
                </small>
              </div>

              <form
                onSubmit={
                  movimentarEstoque
                }
                className={
                  styles.stockForm
                }
              >
                <div
                  className={
                    styles.movementTypes
                  }
                >
                  <button
                    type="button"
                    className={
                      movimento.tipo ===
                      'entrada'
                        ? styles.movementActive
                        : styles.movement
                    }
                    onClick={() =>
                      setMovimento(
                        (
                          anterior,
                        ) => ({
                          ...anterior,
                          tipo: 'entrada',
                        }),
                      )
                    }
                  >
                    <TrendingUp
                      size={18}
                    />

                    <span>
                      Entrada
                    </span>

                    <small>
                      Adicionar
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      movimento.tipo ===
                      'saida'
                        ? styles.movementActive
                        : styles.movement
                    }
                    onClick={() =>
                      setMovimento(
                        (
                          anterior,
                        ) => ({
                          ...anterior,
                          tipo: 'saida',
                        }),
                      )
                    }
                  >
                    <TrendingDown
                      size={18}
                    />

                    <span>
                      Saída
                    </span>

                    <small>
                      Retirar
                    </small>
                  </button>
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label htmlFor="quantidade-estoque">
                    Quantidade
                  </label>

                  <input
                    id="quantidade-estoque"
                    type="number"
                    min="1"
                    max="999999"
                    step="1"
                    inputMode="numeric"
                    value={
                      movimento.quantidade
                    }
                    onChange={(
                      event,
                    ) =>
                      setMovimento(
                        (
                          anterior,
                        ) => ({
                          ...anterior,
                          quantidade:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    required
                  />
                </div>

                <div
                  className={
                    styles.stockModalFooter
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.cancelButton
                    }
                    onClick={
                      fecharEstoque
                    }
                    disabled={
                      salvando
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className={
                      movimento.tipo ===
                      'entrada'
                        ? styles.saveButton
                        : styles.dangerButton
                    }
                    disabled={
                      salvando
                    }
                  >
                    {salvando ? (
                      <Loader2
                        size={17}
                        className={
                          styles.spin
                        }
                      />
                    ) : movimento.tipo ===
                      'entrada' ? (
                      <TrendingUp
                        size={17}
                      />
                    ) : (
                      <TrendingDown
                        size={17}
                      />
                    )}

                    {movimento.tipo ===
                    'entrada'
                      ? 'Registrar entrada'
                      : 'Registrar saída'}
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
        </div>
      )}
    </main>
  )
}