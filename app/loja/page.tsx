'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  ShoppingBag,
  Search,
  Heart,
  X,
} from 'lucide-react'

import styles from './Loja.module.css'

import Carrinho, {
  ItemCarrinho,
} from '../components/Carrinho/Carrinho'

import { Checkout } from '../components/Checkout/Checkout'

type Produto = {
  id: string
  name: string
  description: string | null
  price: string | number
  category: string
  image_url: string | null
  stock: number
  active: boolean
  slug: string | null
}

const STORAGE_KEY = 'belo-cao-carrinho'

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function obterEstoque(valor: unknown) {
  const estoque = Number(valor)

  if (!Number.isFinite(estoque)) {
    return 0
  }

  return Math.max(0, Math.floor(estoque))
}

function obterQuantidade(valor: unknown) {
  const quantidade = Number(valor)

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return 1
  }

  return Math.max(1, Math.floor(quantidade))
}

export default function LojaPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])

  const [categoria, setCategoria] = useState('Todos')

  const [busca, setBusca] = useState('')

  const [carregando, setCarregando] = useState(true)

  const [erro, setErro] = useState('')

  const [produtoDescricao, setProdutoDescricao] =
    useState<Produto | null>(null)

  const [carrinhoAberto, setCarrinhoAberto] =
    useState(false)

  const [checkoutAberto, setCheckoutAberto] =
    useState(false)

  const [carrinho, setCarrinho] =
    useState<ItemCarrinho[]>([])

  const [carrinhoCarregado, setCarrinhoCarregado] =
    useState(false)

  /* =========================================================
     CARREGAR PRODUTOS
     ========================================================= */

  async function carregarProdutos(
    mostrarCarregamento = true,
  ) {
    try {
      if (mostrarCarregamento) {
        setCarregando(true)
      }

      setErro('')

      const response = await fetch('/api/produtos', {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(
          'Erro ao carregar produtos.',
        )
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error(
          'Resposta inválida da API.',
        )
      }

      const produtosNormalizados: Produto[] =
        data
          .filter(
            (produto): produto is Produto =>
              Boolean(
                produto &&
                  typeof produto.id === 'string',
              ),
          )
          .map((produto) => ({
            ...produto,
            stock: obterEstoque(
              produto.stock,
            ),
            active: Boolean(
              produto.active,
            ),
          }))

      setProdutos(
        produtosNormalizados,
      )
    } catch (error) {
      console.error(
        'Erro ao carregar produtos:',
        error,
      )

      if (mostrarCarregamento) {
        setErro(
          'Não foi possível carregar a lojinha.',
        )
      }
    } finally {
      if (mostrarCarregamento) {
        setCarregando(false)
      }
    }
  }

  useEffect(() => {
    carregarProdutos(true)
  }, [])

  /* =========================================================
     ATUALIZAR ESTOQUE PERIODICAMENTE
     ========================================================= */

  useEffect(() => {
    const intervalo =
      window.setInterval(() => {
        carregarProdutos(false)
      }, 30000)

    return () => {
      window.clearInterval(intervalo)
    }
  }, [])

  /* =========================================================
     RESTAURAR CARRINHO
     ========================================================= */

  useEffect(() => {
    try {
      const salvo =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (salvo) {
        const dados = JSON.parse(salvo)

        if (Array.isArray(dados)) {
          const carrinhoValido: ItemCarrinho[] =
            dados
              .filter(
                (item) =>
                  item &&
                  typeof item.id === 'string',
              )
              .map((item) => ({
                ...item,
                quantidade:
                  obterQuantidade(
                    item.quantidade,
                  ),
                stock:
                  obterEstoque(
                    item.stock,
                  ),
              }))

          setCarrinho(
            carrinhoValido,
          )
        }
      }
    } catch (error) {
      console.error(
        'Erro ao recuperar carrinho:',
        error,
      )

      window.localStorage.removeItem(
        STORAGE_KEY,
      )
    } finally {
      setCarrinhoCarregado(true)
    }
  }, [])

  /* =========================================================
     SINCRONIZAR CARRINHO COM ESTOQUE ATUAL
     ========================================================= */

  useEffect(() => {
    if (
      !carrinhoCarregado ||
      produtos.length === 0
    ) {
      return
    }

    setCarrinho((atual) => {
      let alterado = false

      const novoCarrinho = atual
        .map((item) => {
          const produtoAtual =
            produtos.find(
              (produto) =>
                produto.id === item.id,
            )

          /*
           * Produto não existe mais ou
           * está inativo.
           */
          if (
            !produtoAtual ||
            !produtoAtual.active
          ) {
            alterado = true
            return null
          }

          const estoqueAtual =
            obterEstoque(
              produtoAtual.stock,
            )

          /*
           * Produto ficou sem estoque.
           */
          if (estoqueAtual <= 0) {
            alterado = true
            return null
          }

          const quantidadeAtual =
            obterQuantidade(
              item.quantidade,
            )

          /*
           * Não permite que o carrinho
           * ultrapasse o estoque atual.
           */
          const quantidadeAjustada =
            Math.min(
              quantidadeAtual,
              estoqueAtual,
            )

          if (
            quantidadeAjustada !==
              quantidadeAtual ||
            obterEstoque(
              item.stock,
            ) !== estoqueAtual
          ) {
            alterado = true
          }

          return {
            ...item,
            ...produtoAtual,
            quantidade:
              quantidadeAjustada,
            stock: estoqueAtual,
          }
        })
        .filter(
          (
            item,
          ): item is ItemCarrinho =>
            item !== null,
        )

      return alterado
        ? novoCarrinho
        : atual
    })
  }, [
    produtos,
    carrinhoCarregado,
  ])

  /* =========================================================
     SALVAR CARRINHO
     ========================================================= */

  useEffect(() => {
    if (!carrinhoCarregado) {
      return
    }

    try {
      if (carrinho.length === 0) {
        window.localStorage.removeItem(
          STORAGE_KEY,
        )
        return
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(carrinho),
      )
    } catch (error) {
      console.error(
        'Erro ao salvar carrinho:',
        error,
      )
    }
  }, [
    carrinho,
    carrinhoCarregado,
  ])

  /* =========================================================
     CATEGORIAS
     ========================================================= */

  const categorias = useMemo(() => {
    const lista = Array.from(
      new Set(
        produtos
          .filter(
            (produto) =>
              produto.active,
          )
          .map(
            (produto) =>
              produto.category,
          )
          .filter(
            (cat): cat is string =>
              Boolean(cat),
          ),
      ),
    )

    return ['Todos', ...lista]
  }, [produtos])

  /* =========================================================
     FILTRO
     ========================================================= */

  const produtosFiltrados =
    useMemo(() => {
      const termo =
        normalizarTexto(busca)

      return produtos.filter(
        (produto) => {
          if (!produto.active) {
            return false
          }

          const categoriaProduto =
            normalizarTexto(
              produto.category ?? '',
            )

          const correspondeCategoria =
            categoria === 'Todos' ||
            categoriaProduto ===
              normalizarTexto(
                categoria,
              )

          if (!termo) {
            return correspondeCategoria
          }

          const nome =
            normalizarTexto(
              produto.name ?? '',
            )

          const descricao =
            normalizarTexto(
              produto.description ?? '',
            )

          const categoriaTexto =
            normalizarTexto(
              produto.category ?? '',
            )

          const correspondeBusca =
            nome.includes(termo) ||
            descricao.includes(termo) ||
            categoriaTexto.includes(
              termo,
            )

          return (
            correspondeCategoria &&
            correspondeBusca
          )
        },
      )
    }, [
      produtos,
      categoria,
      busca,
    ])

  /* =========================================================
     PREÇO
     ========================================================= */

  function formatarPreco(
    valor: string | number,
  ) {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) {
      return 'R$ 0,00'
    }

    return numero.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL',
      },
    )
  }

  /* =========================================================
     ADICIONAR AO CARRINHO
     ========================================================= */

  function adicionarAoCarrinho(
    produto: Produto,
  ) {
    if (!produto.active) {
      return
    }

    const estoque =
      obterEstoque(
        produto.stock,
      )

    if (estoque <= 0) {
      return
    }

    setCarrinho((atual) => {
      const existente =
        atual.find(
          (item) =>
            item.id === produto.id,
        )

      if (existente) {
        const quantidadeAtual =
          obterQuantidade(
            existente.quantidade,
          )

        if (
          quantidadeAtual >=
          estoque
        ) {
          return atual
        }

        return atual.map(
          (item) =>
            item.id === produto.id
              ? {
                  ...item,
                  ...produto,
                  stock: estoque,
                  quantidade:
                    quantidadeAtual +
                    1,
                }
              : item,
        )
      }

      return [
        ...atual,
        {
          ...produto,
          stock: estoque,
          quantidade: 1,
        },
      ]
    })

    setCarrinhoAberto(true)
  }

  /* =========================================================
     AUMENTAR
     ========================================================= */

  function aumentarQuantidade(
    id: string,
  ) {
    setCarrinho((atual) =>
      atual
        .map((item) => {
          if (item.id !== id) {
            return item
          }

          const quantidadeAtual =
            obterQuantidade(
              item.quantidade,
            )

          const produtoAtual =
            produtos.find(
              (produto) =>
                produto.id === id,
            )

          const estoque =
            produtoAtual
              ? obterEstoque(
                  produtoAtual.stock,
                )
              : obterEstoque(
                  item.stock,
                )

          if (estoque <= 0) {
            return {
              ...item,
              stock: 0,
              quantidade: 0,
            }
          }

          if (
            quantidadeAtual >=
            estoque
          ) {
            return {
              ...item,
              stock: estoque,
              quantidade:
                Math.min(
                  quantidadeAtual,
                  estoque,
                ),
            }
          }

          return {
            ...item,
            stock: estoque,
            quantidade:
              quantidadeAtual + 1,
          }
        })
        .filter(
          (item) =>
            obterQuantidade(
              item.quantidade,
            ) > 0,
        ),
    )
  }

  /* =========================================================
     DIMINUIR
     ========================================================= */

  function diminuirQuantidade(
    id: string,
  ) {
    setCarrinho((atual) =>
      atual
        .map((item) => {
          if (item.id !== id) {
            return item
          }

          const quantidadeAtual =
            obterQuantidade(
              item.quantidade,
            )

          return {
            ...item,
            quantidade:
              quantidadeAtual - 1,
          }
        })
        .filter(
          (item) =>
            Number(
              item.quantidade,
            ) > 0,
        ),
    )
  }

  /* =========================================================
     REMOVER
     ========================================================= */

  function removerDoCarrinho(
    id: string,
  ) {
    setCarrinho((atual) =>
      atual.filter(
        (item) =>
          item.id !== id,
      ),
    )
  }

  /* =========================================================
     CONTINUAR COMPRANDO
     ========================================================= */

  function continuarComprando() {
    setCarrinhoAberto(false)

    carregarProdutos(false)
  }

  /* =========================================================
     ABRIR CHECKOUT
     ========================================================= */

  function finalizarPedido() {
    if (carrinho.length === 0) {
      return
    }

    const existeProdutoSemEstoque =
      carrinho.some((item) => {
        const produto =
          produtos.find(
            (p) =>
              p.id === item.id,
          )

        if (!produto) {
          return true
        }

        const estoque =
          obterEstoque(
            produto.stock,
          )

        const quantidade =
          obterQuantidade(
            item.quantidade,
          )

        return (
          !produto.active ||
          estoque <= 0 ||
          quantidade > estoque
        )
      })

    if (
      existeProdutoSemEstoque
    ) {
      carregarProdutos(false)

      setCarrinhoAberto(true)

      return
    }

    setCarrinhoAberto(false)
    setCheckoutAberto(true)
  }

  /* =========================================================
     VOLTAR DO CHECKOUT
     ========================================================= */

  function voltarParaCarrinho() {
    setCheckoutAberto(false)
    setCarrinhoAberto(true)

    carregarProdutos(false)
  }

  /* =========================================================
     PEDIDO FINALIZADO
     ========================================================= */

  function pedidoFinalizado() {
    setCarrinho([])

    try {
      window.localStorage.removeItem(
        STORAGE_KEY,
      )
    } catch (error) {
      console.error(
        'Erro ao limpar carrinho:',
        error,
      )
    }

    setCheckoutAberto(false)
    setCarrinhoAberto(false)

    carregarProdutos(false)
  }

  /* =========================================================
     LIMPAR BUSCA
     ========================================================= */

  function limparBusca() {
    setBusca('')
  }

  /* =========================================================
     QUANTIDADE TOTAL
     ========================================================= */

  const quantidadeTotal =
    carrinho.reduce(
      (total, item) => {
        const quantidade =
          obterQuantidade(
            item.quantidade,
          )

        return total + quantidade
      },
      0,
    )

  /* =========================================================
     PRODUTOS ATIVOS
     ========================================================= */

  const quantidadeProdutosAtivos =
    produtos.filter(
      (produto) =>
        produto.active,
    ).length

  return (
    <main className={styles.loja}>
      <div
        className={
          styles.shapeLarge
        }
        aria-hidden="true"
      />

      <div
        className={
          styles.shapeMedium
        }
        aria-hidden="true"
      />

      <div
        className={
          styles.dotPattern
        }
        aria-hidden="true"
      />

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header
        className={styles.header}
      >
        <Link
          href="/"
          className={styles.back}
        >
          <ArrowLeft
            size={16}
            strokeWidth={2}
          />

          <span>
            Voltar
          </span>
        </Link>

        <div
          className={styles.brand}
        >
          <span>
            BELO CÃO
          </span>

          <i />

          <span>
            LOJINHA
          </span>
        </div>

        <button
          type="button"
          className={
            styles.headerBag
          }
          aria-label={`Abrir carrinho${
            quantidadeTotal > 0
              ? ` com ${quantidadeTotal} itens`
              : ''
          }`}
          onClick={() => {
            carregarProdutos(false)

            setCarrinhoAberto(true)
          }}
        >
          <ShoppingBag
            size={19}
            strokeWidth={1.9}
          />

          {quantidadeTotal > 0 && (
            <span>
              {quantidadeTotal}
            </span>
          )}
        </button>
      </header>

      {/* =====================================================
          INTRO
          ===================================================== */}

      <section
        className={styles.intro}
      >
        <div
          className={
            styles.introText
          }
        >
          <div
            className={
              styles.eyebrow
            }
          >
            <span
              className={
                styles.eyebrowIcon
              }
            >
              <Heart
                size={12}
                fill="currentColor"
                strokeWidth={2}
              />
            </span>

            <span>
              Escolhas para eles
            </span>
          </div>

          <h1>
            TUDO QUE{' '}
            <span>
              ELES
            </span>{' '}
            <strong>
              AMAM.
            </strong>
          </h1>

          <p>
            Petiscos, cuidados e
            produtos escolhidos para
            deixar a rotina do seu cão
            ainda melhor.
          </p>
        </div>

        <div
          className={
            styles.introMeta
          }
        >
          <span>
            01
          </span>

          <i />

          <span>
            {quantidadeProdutosAtivos}{' '}
            {quantidadeProdutosAtivos ===
            1
              ? 'produto'
              : 'produtos'}
          </span>
        </div>
      </section>

      {/* =====================================================
          CONTROLES
          ===================================================== */}

      <section
        className={
          styles.controls
        }
      >
        <div
          className={
            styles.categories
          }
        >
          {categorias.map(
            (item) => (
              <button
                key={item}
                type="button"
                className={
                  categoria === item
                    ? styles.categoryActive
                    : styles.category
                }
                onClick={() =>
                  setCategoria(
                    item,
                  )
                }
              >
                {item}
              </button>
            ),
          )}
        </div>

        <label
          className={
            styles.search
          }
        >
          <Search
            size={17}
            strokeWidth={2}
          />

          <input
            type="search"
            placeholder="Buscar produto"
            value={busca}
            onChange={(event) =>
              setBusca(
                event.target.value,
              )
            }
            aria-label="Buscar produto"
            autoComplete="off"
          />

          {busca && (
            <button
              type="button"
              onClick={
                limparBusca
              }
              aria-label="Limpar busca"
              className={
                styles.searchClear
              }
            >
              ×
            </button>
          )}
        </label>
      </section>

      {/* =====================================================
          RESULTADO DA BUSCA
          ===================================================== */}

      {!carregando &&
        !erro &&
        busca.trim() && (
          <div
            className={
              styles.searchResult
            }
          >
            <span>
              BUSCA
            </span>

            <strong>
              {
                produtosFiltrados.length
              }{' '}
              {produtosFiltrados.length ===
              1
                ? 'produto encontrado'
                : 'produtos encontrados'}
            </strong>
          </div>
        )}

      {/* =====================================================
          PRODUTOS
          ===================================================== */}

      <section
        className={
          styles.productsSection
        }
      >
        {carregando && (
          <div
            className={
              styles.state
            }
          >
            <span>
              CARREGANDO
            </span>

            <strong>
              Preparando a lojinha...
            </strong>
          </div>
        )}

        {!carregando &&
          erro && (
            <div
              className={
                styles.state
              }
            >
              <span>
                OPS
              </span>

              <strong>
                {erro}
              </strong>
            </div>
          )}

        {!carregando &&
          !erro &&
          produtosFiltrados.length ===
            0 && (
            <div
              className={
                styles.state
              }
            >
              <span>
                NENHUM RESULTADO
              </span>

              <strong>
                Não encontramos esse
                produto.
              </strong>
            </div>
          )}

        {!carregando &&
          !erro &&
          produtosFiltrados.length >
            0 && (
            <div
              className={
                styles.grid
              }
            >
              {produtosFiltrados.map(
                (
                  produto,
                  index,
                ) => {
                  const estoque =
                    obterEstoque(
                      produto.stock,
                    )

                  const semEstoque =
                    estoque <= 0

                  const estoqueBaixo =
                    estoque > 0 &&
                    estoque <= 3

                  const estoqueTexto =
                    semEstoque
                      ? 'ESGOTADO'
                      : estoque === 1
                        ? 'ÚLTIMA UNIDADE'
                        : estoque <= 3
                          ? 'ÚLTIMAS UNIDADES'
                          : 'DISPONÍVEL'

                  return (
                    <article
                      key={
                        produto.id
                      }
                      className={`${styles.card} ${
                        semEstoque
                          ? styles.cardOutOfStock
                          : ''
                      }`}
                    >
                      <div
                        className={
                          styles.cardImage
                        }
                      >
                        <span
                          className={
                            styles.cardNumber
                          }
                        >
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            '0',
                          )}
                        </span>

                        {produto.image_url ? (
                          <Image
                            src={
                              produto.image_url
                            }
                            alt={
                              produto.name
                            }
                            fill
                            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
                          />
                        ) : (
                          <div
                            className={
                              styles.imagePlaceholder
                            }
                          >
                            <ShoppingBag
                              size={28}
                              strokeWidth={
                                1.4
                              }
                            />

                            <span>
                              FOTO EM BREVE
                            </span>
                          </div>
                        )}

                        {semEstoque && (
                          <div
                            className={
                              styles.stockBadge
                            }
                          >
                            ESGOTADO
                          </div>
                        )}

                        <button
                          type="button"
                          className={
                            styles.favorite
                          }
                          aria-label={`Favoritar ${produto.name}`}
                        >
                          <Heart
                            size={17}
                            strokeWidth={
                              1.8
                            }
                          />
                        </button>
                      </div>

                      <div
                        className={
                          styles.cardContent
                        }
                      >
                        <span
                          className={
                            styles.cardCategory
                          }
                        >
                          {
                            produto.category
                          }
                        </span>

                        <h2>
                          {
                            produto.name
                          }
                        </h2>

                        {/* =================================================
                            ESTOQUE
                            ================================================= */}

                        <div
                          className={`${styles.stockStatus} ${
                            semEstoque
                              ? styles.stockStatusOut
                              : estoqueBaixo
                                ? styles.stockStatusLow
                                : styles.stockStatusAvailable
                          }`}
                          aria-label={`Estoque de ${produto.name}: ${estoque} unidades`}
                        >
                          <span
                            className={
                              styles.stockIndicator
                            }
                          />

                          <span
                            className={
                              styles.stockLabel
                            }
                          >
                            ESTOQUE
                          </span>

                          <strong>
                            {estoque}
                          </strong>

                          <small>
                            {
                              estoqueTexto
                            }
                          </small>
                        </div>

                        {produto.description && (
                          <button
                            type="button"
                            className={
                              styles.descriptionButton
                            }
                            onClick={() =>
                              setProdutoDescricao(
                                produto,
                              )
                            }
                            aria-label={`Ver descrição de ${produto.name}`}
                          >
                            Descrição
                          </button>
                        )}

                        <div
                          className={
                            styles.cardBottom
                          }
                        >
                          <strong>
                            {formatarPreco(
                              produto.price,
                            )}
                          </strong>

                          <button
                            type="button"
                            className={
                              styles.addButton
                            }
                            disabled={
                              semEstoque
                            }
                            title={
                              semEstoque
                                ? 'Produto sem estoque'
                                : estoque ===
                                    1
                                  ? 'Última unidade disponível'
                                  : 'Adicionar ao carrinho'
                            }
                            onClick={() =>
                              adicionarAoCarrinho(
                                produto,
                              )
                            }
                          >
                            <span>
                              {semEstoque
                                ? 'Esgotado'
                                : 'Adicionar'}
                            </span>

                            {!semEstoque && (
                              <ArrowUpRight
                                size={16}
                                strokeWidth={
                                  2.2
                                }
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                },
              )}
            </div>
          )}
      </section>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer
        className={
          styles.footer
        }
      >
        <span>
          BELO CÃO · ESTÉTICA ANIMAL ·
          PET COFFEE
        </span>

        <span>
          FEITO PARA ELES
        </span>
      </footer>

      {/* =====================================================
          DESCRIÇÃO DO PRODUTO
          ===================================================== */}

      {produtoDescricao && (
        <div
          className={
            styles.descriptionOverlay
          }
          onClick={() =>
            setProdutoDescricao(
              null,
            )
          }
        >
          <div
            className={
              styles.descriptionModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="descricao-produto"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className={
                styles.descriptionClose
              }
              onClick={() =>
                setProdutoDescricao(
                  null,
                )
              }
              aria-label="Fechar descrição"
            >
              <X
                size={17}
                strokeWidth={2}
              />
            </button>

            <span
              className={
                styles.descriptionCategory
              }
            >
              {
                produtoDescricao.category
              }
            </span>

            <h2 id="descricao-produto">
              {
                produtoDescricao.name
              }
            </h2>

            <p>
              {
                produtoDescricao.description
              }
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          CARRINHO
          ===================================================== */}

      <Carrinho
        aberto={
          carrinhoAberto
        }
        itens={carrinho}
        onFechar={() =>
          setCarrinhoAberto(
            false,
          )
        }
        onAumentar={
          aumentarQuantidade
        }
        onDiminuir={
          diminuirQuantidade
        }
        onRemover={
          removerDoCarrinho
        }
        onContinuarComprando={
          continuarComprando
        }
        onFinalizar={
          finalizarPedido
        }
      />

      {/* =====================================================
          CHECKOUT
          ===================================================== */}

      <Checkout
        aberto={
          checkoutAberto
        }
        itens={carrinho}
        onFechar={() =>
          setCheckoutAberto(
            false,
          )
        }
        onVoltarCarrinho={
          voltarParaCarrinho
        }
        onPedidoFinalizado={
          pedidoFinalizado
        }
      />
    </main>
  )
}