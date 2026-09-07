
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
  type ItemCarrinho,
} from '@/app/components/Carrinho/Carrinho'

import type {
  ClienteCheckout,
  PedidoFinalizado,
} from '@/app/components/Checkout/Checkout'

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

const STORAGE_KEY = 'belo-cao-carrinho-v1'

const WHATSAPP_LOJA = '5512997093459'

export default function Loja() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoria, setCategoria] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [produtoDescricao, setProdutoDescricao] =
    useState<Produto | null>(null)

  const [carrinhoAberto, setCarrinhoAberto] =
    useState(false)

  const [carrinho, setCarrinho] =
    useState<ItemCarrinho[]>([])

  const [carrinhoCarregado, setCarrinhoCarregado] =
    useState(false)

  const [cliente, setCliente] =
    useState<ClienteCheckout | null>(null)

  /*
   * ============================================================
   * CARREGAR PRODUTOS
   * ============================================================
   */

  useEffect(() => {
    async function carregarProdutos() {
      try {
        setCarregando(true)
        setErro('')

        const resposta = await fetch(
          '/api/produtos',
          {
            cache: 'no-store',
          }
        )

        if (!resposta.ok) {
          throw new Error(
            'Não foi possível carregar os produtos.'
          )
        }

        const dados = await resposta.json()

        if (!Array.isArray(dados)) {
          throw new Error(
            'Formato de produtos inválido.'
          )
        }

        setProdutos(dados)
      } catch (error) {
        console.error(error)

        setErro(
          error instanceof Error
            ? error.message
            : 'Erro ao carregar os produtos.'
        )
      } finally {
        setCarregando(false)
      }
    }

    carregarProdutos()
  }, [])

  /*
   * ============================================================
   * RECUPERAR CARRINHO
   * ============================================================
   */

  useEffect(() => {
    try {
      const salvo =
        window.localStorage.getItem(
          STORAGE_KEY
        )

      if (!salvo) {
        setCarrinho([])
        return
      }

      const dados = JSON.parse(salvo)

      if (!Array.isArray(dados)) {
        setCarrinho([])
        return
      }

      const itensValidos: ItemCarrinho[] =
        dados.filter(
          (item): item is ItemCarrinho => {
            return (
              item &&
              typeof item.id === 'string' &&
              typeof item.name === 'string' &&
              typeof item.price === 'number' &&
              Number.isFinite(item.price) &&
              (
                item.image_url === null ||
                typeof item.image_url === 'string'
              ) &&
              typeof item.quantity === 'number' &&
              Number.isFinite(item.quantity) &&
              item.quantity > 0
            )
          }
        )

      setCarrinho(itensValidos)
    } catch (error) {
      console.error(
        'Erro ao recuperar carrinho:',
        error
      )

      setCarrinho([])
    } finally {
      setCarrinhoCarregado(true)
    }
  }, [])

  /*
   * ============================================================
   * SALVAR CARRINHO
   * ============================================================
   */

  useEffect(() => {
    if (!carrinhoCarregado) {
      return
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(carrinho)
      )
    } catch (error) {
      console.error(
        'Erro ao salvar carrinho:',
        error
      )
    }
  }, [carrinho, carrinhoCarregado])

  /*
   * ============================================================
   * CATEGORIAS
   * ============================================================
   */

  const categorias = useMemo(() => {
    const lista = produtos
      .map((produto) => produto.category)
      .filter(Boolean)

    return [
      'Todos',
      ...Array.from(new Set(lista)),
    ]
  }, [produtos])

  /*
   * ============================================================
   * PRODUTOS FILTRADOS
   * ============================================================
   */

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return produtos.filter((produto) => {
      if (!produto.active) {
        return false
      }

      const categoriaOk =
        categoria === 'Todos' ||
        produto.category === categoria

      const buscaOk =
        !termo ||
        produto.name
          .toLowerCase()
          .includes(termo) ||
        (produto.description ?? '')
          .toLowerCase()
          .includes(termo)

      return categoriaOk && buscaOk
    })
  }, [produtos, categoria, busca])

  /*
   * ============================================================
   * TOTAL DE ITENS
   * ============================================================
   */

  const quantidadeTotal = useMemo(() => {
    return carrinho.reduce(
      (total, item) =>
        total + item.quantity,
      0
    )
  }, [carrinho])

  /*
   * ============================================================
   * CONVERTER PREÇO
   * ============================================================
   */

  function converterPreco(
    valor: string | number
  ) {
    if (typeof valor === 'number') {
      return Number.isFinite(valor)
        ? valor
        : 0
    }

    const texto = String(valor).trim()

    if (!texto) {
      return 0
    }

    const limpo = texto
      .replace(/\s/g, '')
      .replace(/R\$/gi, '')

    const numero = limpo.includes(',')
      ? Number(
          limpo
            .replace(/\./g, '')
            .replace(',', '.')
        )
      : Number(limpo)

    return Number.isFinite(numero)
      ? numero
      : 0
  }

  /*
   * ============================================================
   * ADICIONAR
   * ============================================================
   */

  function adicionarAoCarrinho(
    produto: Produto
  ) {
    if (produto.stock <= 0) {
      return
    }

    setCarrinho((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id
      )

      if (existente) {
        if (
          existente.quantity >=
          produto.stock
        ) {
          return atual
        }

        return atual.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        )
      }

      return [
        ...atual,
        {
          id: produto.id,
          name: produto.name,
          price: converterPreco(
            produto.price
          ),
          image_url:
            produto.image_url,
          quantity: 1,
        },
      ]
    })

    setCarrinhoAberto(true)
  }

  /*
   * ============================================================
   * AUMENTAR
   * ============================================================
   */

  function aumentarQuantidade(
    id: string
  ) {
    const produto = produtos.find(
      (item) => item.id === id
    )

    if (!produto) {
      return
    }

    setCarrinho((atual) =>
      atual.map((item) => {
        if (item.id !== id) {
          return item
        }

        if (
          item.quantity >=
          produto.stock
        ) {
          return item
        }

        return {
          ...item,
          quantity:
            item.quantity + 1,
        }
      })
    )
  }

  /*
   * ============================================================
   * DIMINUIR
   * ============================================================
   */

  function diminuirQuantidade(
    id: string
  ) {
    setCarrinho((atual) =>
      atual
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    )
  }

  /*
   * ============================================================
   * REMOVER
   * ============================================================
   */

  function removerDoCarrinho(
    id: string
  ) {
    setCarrinho((atual) =>
      atual.filter(
        (item) => item.id !== id
      )
    )
  }

  /*
   * ============================================================
   * MONTAR MENSAGEM DO WHATSAPP
   * ============================================================
   */

  function montarMensagemPedido(
    pedido: PedidoFinalizado
  ) {
    const linhas: string[] = []

    linhas.push(
      '🐾 *NOVO PEDIDO — BELO CÃO*'
    )

    linhas.push('')

    linhas.push('*CLIENTE*')
    linhas.push(
      `Nome: ${pedido.cliente.nome}`
    )
    linhas.push(
      `WhatsApp: ${pedido.cliente.whatsapp}`
    )

    linhas.push('')

    if (
      pedido.tipoEntrega === 'entrega'
    ) {
      linhas.push(
        '*FORMA DE RECEBIMENTO*'
      )
      linhas.push('Entrega')

      linhas.push('')

      linhas.push('*ENDEREÇO*')
      linhas.push(
        `${pedido.cliente.rua}, ${pedido.cliente.numero}`
      )

      if (
        pedido.cliente.complemento
      ) {
        linhas.push(
          `Complemento: ${pedido.cliente.complemento}`
        )
      }

      linhas.push(
        `Bairro: ${pedido.cliente.bairro}`
      )

      linhas.push(
        `Cidade: ${pedido.cliente.cidade} - ${pedido.cliente.uf}`
      )

      linhas.push(
        `CEP: ${pedido.cliente.cep}`
      )
    } else {
      linhas.push(
        '*FORMA DE RECEBIMENTO*'
      )
      linhas.push(
        'Retirada na loja'
      )
    }

    linhas.push('')
    linhas.push('*PEDIDO*')

    carrinho.forEach((item) => {
      const subtotal =
        item.price * item.quantity

      linhas.push(
        `${item.quantity}x ${item.name} — ${subtotal.toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
          }
        )}`
      )
    })

    const total = carrinho.reduce(
      (soma, item) =>
        soma +
        item.price * item.quantity,
      0
    )

    linhas.push('')
    linhas.push(
      `*TOTAL: ${total.toLocaleString(
        'pt-BR',
        {
          style: 'currency',
          currency: 'BRL',
        }
      )}*`
    )

    linhas.push('')
    linhas.push(
      'Pedido enviado pelo site Belo Cão.'
    )

    return linhas.join('\n')
  }

  /*
   * ============================================================
   * PEDIDO FINALIZADO
   *
   * 1. Gera mensagem
   * 2. Abre WhatsApp
   * 3. Limpa carrinho
   * 4. Fecha sacola
   * ============================================================
   */

  function finalizarPedido(
    pedido: PedidoFinalizado
  ) {
    if (carrinho.length === 0) {
      return
    }

    setCliente(pedido.cliente)

    const mensagem =
      montarMensagemPedido(pedido)

    const url =
      `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(
        mensagem
      )}`

    /*
     * Abre o WhatsApp com o pedido preenchido.
     */
    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )

    /*
     * Depois de abrir o WhatsApp,
     * limpa o carrinho.
     */
    setCarrinho([])

    try {
      window.localStorage.removeItem(
        STORAGE_KEY
      )
    } catch (error) {
      console.error(
        'Erro ao limpar carrinho salvo:',
        error
      )
    }

    /*
     * Fecha a sacola.
     */
    setCarrinhoAberto(false)
  }

  return (
    <>
      <main className={styles.loja}>
        <div
          className={styles.shapeLarge}
          aria-hidden="true"
        />

        <div
          className={styles.shapeMedium}
          aria-hidden="true"
        />

        <div
          className={styles.dotPattern}
          aria-hidden="true"
        />

        <header className={styles.header}>
          <Link
            href="/"
            className={styles.back}
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft size={17} />
            Voltar
          </Link>

          <div
            className={styles.brand}
            aria-label="Belo Cão"
          >
            <i aria-hidden="true" />
            <span>BELO CÃO</span>
            <i aria-hidden="true" />
          </div>

          <button
            type="button"
            className={styles.headerBag}
            onClick={() =>
              setCarrinhoAberto(true)
            }
            aria-label={
              quantidadeTotal > 0
                ? `Abrir sacola com ${quantidadeTotal} itens`
                : 'Abrir sacola'
            }
          >
            <ShoppingBag size={19} />

            {quantidadeTotal > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  display: 'grid',
                  placeItems: 'center',
                  boxSizing: 'border-box',
                  borderRadius: '50%',
                  background: '#672f96',
                  color: '#ffffff',
                  fontSize: '8px',
                  fontWeight: 800,
                }}
              >
                {quantidadeTotal}
              </span>
            )}
          </button>
        </header>

        <section className={styles.intro}>
          <div className={styles.introText}>
            <div className={styles.eyebrow}>
              <span
                className={
                  styles.eyebrowIcon
                }
                aria-hidden="true"
              >
                <Heart size={12} />
              </span>

              BELO CÃO
            </div>

            <h1>
              <span>Nossa</span>
              <strong>loja</strong>
            </h1>

            <p>
              Encontre produtos selecionados
              para cuidar do seu melhor amigo
              com carinho.
            </p>
          </div>

          <div className={styles.introMeta}>
            <span>
              {produtosFiltrados.length
                .toString()
                .padStart(2, '0')}
            </span>

            <i aria-hidden="true" />

            <span>
              produtos disponíveis
            </span>
          </div>
        </section>

        <section
          className={styles.controls}
          aria-label="Filtros da loja"
        >
          <div className={styles.categories}>
            {categorias.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  categoria === item
                    ? styles.categoryActive
                    : styles.category
                }
                onClick={() =>
                  setCategoria(item)
                }
              >
                {item}
              </button>
            ))}
          </div>

          <div className={styles.search}>
            <Search size={16} />

            <input
              type="search"
              value={busca}
              onChange={(event) =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Buscar produto..."
              aria-label="Buscar produto"
            />

            {busca && (
              <button
                type="button"
                onClick={() =>
                  setBusca('')
                }
                aria-label="Limpar busca"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  border: 0,
                  background:
                    'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </section>

        {carregando && (
          <div className={styles.state}>
            <span>BELO CÃO</span>

            <strong>
              Carregando produtos...
            </strong>
          </div>
        )}

        {!carregando && erro && (
          <div className={styles.state}>
            <span>ERRO</span>

            <strong>{erro}</strong>
          </div>
        )}

        {!carregando &&
          !erro &&
          produtosFiltrados.length === 0 && (
            <div className={styles.state}>
              <span>BELO CÃO</span>

              <strong>
                Nenhum produto encontrado.
              </strong>
            </div>
          )}

        {!carregando &&
          !erro &&
          produtosFiltrados.length > 0 && (
            <section
              className={
                styles.productsSection
              }
              aria-label="Produtos"
            >
              <div className={styles.grid}>
                {produtosFiltrados.map(
                  (produto, index) => {
                    const preco =
                      converterPreco(
                        produto.price
                      )

                    const semEstoque =
                      produto.stock <= 0

                    return (
                      <article
                        key={produto.id}
                        className={
                          styles.card
                        }
                      >
                        <div
                          className={
                            styles.cardImage
                          }
                        >
                          {produto.image_url ? (
                            <Image
                              src={
                                produto.image_url
                              }
                              alt={
                                produto.name
                              }
                              fill
                              priority={
                                index === 0
                              }
                              loading={
                                index === 0
                                  ? 'eager'
                                  : 'lazy'
                              }
                              sizes="
                                (max-width: 700px) 50vw,
                                (max-width: 1100px) 33vw,
                                25vw
                              "
                            />
                          ) : (
                            <div
                              className={
                                styles.imagePlaceholder
                              }
                            >
                              <Heart
                                size={32}
                              />

                              <span>
                                BELO CÃO
                              </span>
                            </div>
                          )}

                          <span
                            className={
                              styles.cardNumber
                            }
                          >
                            {String(
                              index + 1
                            ).padStart(2, '0')}
                          </span>

                          <button
                            type="button"
                            className={
                              styles.favorite
                            }
                            aria-label={`Favoritar ${produto.name}`}
                          >
                            <Heart
                              size={15}
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
                            {produto.category}
                          </span>

                          <h2>
                            {produto.name}
                          </h2>

                          <button
                            type="button"
                            className={
                              styles.descriptionButton
                            }
                            onClick={() =>
                              setProdutoDescricao(
                                produto
                              )
                            }
                            aria-label={`Ver descrição de ${produto.name}`}
                          >
                            Ver descrição
                            <ArrowUpRight
                              size={12}
                            />
                          </button>

                          <div
                            className={
                              styles.cardBottom
                            }
                          >
                            <strong>
                              {preco.toLocaleString(
                                'pt-BR',
                                {
                                  style:
                                    'currency',
                                  currency:
                                    'BRL',
                                }
                              )}
                            </strong>

                            <button
                              type="button"
                              className={
                                styles.addButton
                              }
                              onClick={() =>
                                adicionarAoCarrinho(
                                  produto
                                )
                              }
                              disabled={
                                semEstoque
                              }
                            >
                              {semEstoque
                                ? 'Sem estoque'
                                : 'Adicionar'}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  }
                )}
              </div>
            </section>
          )}

        {!carregando && !erro && (
          <footer
            className={styles.footer}
          >
            <span>BELO CÃO</span>

            <span>
              Cuidado em cada escolha
            </span>
          </footer>
        )}
      </main>

      {produtoDescricao && (
        <div
          className={
            styles.descriptionOverlay
          }
          onClick={() =>
            setProdutoDescricao(null)
          }
          role="presentation"
        >
          <div
            className={
              styles.descriptionModal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="produto-descricao-titulo"
          >
            <button
              type="button"
              className={
                styles.descriptionClose
              }
              onClick={() =>
                setProdutoDescricao(null)
              }
              aria-label="Fechar descrição"
            >
              <X size={19} />
            </button>

            <span
              className={
                styles.descriptionCategory
              }
            >
              {produtoDescricao.category}
            </span>

            <h2>
              {produtoDescricao.name}
            </h2>

            <p>
              {produtoDescricao.description ||
                'Descrição não disponível para este produto.'}
            </p>
          </div>
        </div>
      )}

      <Carrinho
        aberto={carrinhoAberto}
        onFechar={() =>
          setCarrinhoAberto(false)
        }
        itens={carrinho}
        onAumentar={
          aumentarQuantidade
        }
        onDiminuir={
          diminuirQuantidade
        }
        onRemover={
          removerDoCarrinho
        }
        onFinalizar={
          finalizarPedido
        }
      />
    </>
  )
}
