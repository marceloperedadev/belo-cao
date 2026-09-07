
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

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function LojaPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoria, setCategoria] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [produtoDescricao, setProdutoDescricao] =
    useState<Produto | null>(null)

  /* =========================================================
     CARRINHO
     ========================================================= */

  const [carrinhoAberto, setCarrinhoAberto] =
    useState(false)

  const [carrinho, setCarrinho] =
    useState<ItemCarrinho[]>([])

  useEffect(() => {
    async function carregarProdutos() {
      try {
        setCarregando(true)
        setErro('')

        const response = await fetch('/api/produtos', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar produtos.')
        }

        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Resposta inválida da API.')
        }

        setProdutos(data)
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
        setErro('Não foi possível carregar a lojinha.')
      } finally {
        setCarregando(false)
      }
    }

    carregarProdutos()
  }, [])

  const categorias = useMemo(() => {
    const lista = Array.from(
      new Set(
        produtos
          .map((produto) => produto.category)
          .filter(
            (cat): cat is string => Boolean(cat),
          ),
      ),
    )

    return ['Todos', ...lista]
  }, [produtos])

  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca)

    return produtos.filter((produto) => {
      const categoriaProduto = normalizarTexto(
        produto.category ?? '',
      )

      const correspondeCategoria =
        categoria === 'Todos' ||
        categoriaProduto === normalizarTexto(categoria)

      if (!termo) {
        return correspondeCategoria
      }

      const nome = normalizarTexto(
        produto.name ?? '',
      )

      const descricao = normalizarTexto(
        produto.description ?? '',
      )

      const categoriaTexto = normalizarTexto(
        produto.category ?? '',
      )

      const correspondeBusca =
        nome.includes(termo) ||
        descricao.includes(termo) ||
        categoriaTexto.includes(termo)

      return correspondeCategoria && correspondeBusca
    })
  }, [produtos, categoria, busca])

  function formatarPreco(valor: string | number) {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function limparBusca() {
    setBusca('')
  }

  /* =========================================================
     CARRINHO — FUNÇÕES
     ========================================================= */

  const quantidadeTotal = useMemo(() => {
    return carrinho.reduce(
      (total, item) => total + item.quantity,
      0,
    )
  }, [carrinho])

  function adicionarAoCarrinho(produto: Produto) {
    if (produto.stock <= 0) {
      return
    }

    setCarrinho((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id,
      )

      if (existente) {
        if (existente.quantity >= produto.stock) {
          return atual
        }

        return atual.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        )
      }

      return [
        ...atual,
        {
          id: produto.id,
          name: produto.name,
          price: Number(produto.price),
          image_url: produto.image_url,
          quantity: 1,
        },
      ]
    })

    setCarrinhoAberto(true)
  }

  function aumentarQuantidade(id: string) {
    setCarrinho((atual) =>
      atual.map((item) => {
        if (item.id !== id) {
          return item
        }

        const produto = produtos.find(
          (produtoAtual) => produtoAtual.id === id,
        )

        if (!produto) {
          return item
        }

        if (item.quantity >= produto.stock) {
          return item
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        }
      }),
    )
  }

  function diminuirQuantidade(id: string) {
    setCarrinho((atual) =>
      atual
        .map((item) => {
          if (item.id !== id) {
            return item
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  function removerDoCarrinho(id: string) {
    setCarrinho((atual) =>
      atual.filter((item) => item.id !== id),
    )
  }

  function finalizarPedido() {
    setCarrinhoAberto(false)

    /*
      Próxima etapa:
      cliente → telefone → entrega/retirada
      → pagamento → confirmação → WhatsApp
    */
  }

  return (
    <main className={styles.loja}>
      {/* DECORAÇÕES */}

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

      {/* TOPO */}

      <header className={styles.header}>
        <Link
          href="/"
          className={styles.back}
        >
          <ArrowLeft
            size={16}
            strokeWidth={2}
          />

          <span>Voltar</span>
        </Link>

        <div className={styles.brand}>
          <span>BELO CÃO</span>
          <i />
          <span>LOJINHA</span>
        </div>

        <button
          type="button"
          className={styles.headerBag}
          aria-label={`Abrir carrinho com ${quantidadeTotal} itens`}
          onClick={() => setCarrinhoAberto(true)}
        >
          <ShoppingBag
            size={19}
            strokeWidth={1.9}
          />

          {quantidadeTotal > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '20px',
                height: '20px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                background: 'var(--purple)',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 800,
              }}
            >
              {quantidadeTotal}
            </span>
          )}
        </button>
      </header>

      {/* HERO DA LOJA */}

      <section className={styles.intro}>
        <div className={styles.introText}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowIcon}>
              <Heart
                size={12}
                fill="currentColor"
                strokeWidth={2}
              />
            </span>

            <span>Escolhas para eles</span>
          </div>

          <h1>
            TUDO QUE <span>ELES</span>{' '}
            <strong>AMAM.</strong>
          </h1>

          <p>
            Petiscos, cuidados e produtos escolhidos
            para deixar a rotina do seu cão ainda melhor.
          </p>
        </div>

        <div className={styles.introMeta}>
          <span>01</span>
          <i />
          <span>{produtos.length} produtos</span>
        </div>
      </section>

      {/* CONTROLES */}

      <section className={styles.controls}>
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
              onClick={() => setCategoria(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <label className={styles.search}>
          <Search
            size={17}
            strokeWidth={2}
          />

          <input
            type="search"
            placeholder="Buscar produto"
            value={busca}
            onChange={(event) =>
              setBusca(event.target.value)
            }
            aria-label="Buscar produto"
            autoComplete="off"
          />

          {busca && (
            <button
              type="button"
              onClick={limparBusca}
              aria-label="Limpar busca"
              className={styles.searchClear}
            >
              ×
            </button>
          )}
        </label>
      </section>

      {/* RESULTADO DA BUSCA */}

      {!carregando &&
        !erro &&
        busca.trim() && (
          <div className={styles.searchResult}>
            <span>BUSCA</span>

            <strong>
              {produtosFiltrados.length}{' '}
              {produtosFiltrados.length === 1
                ? 'produto encontrado'
                : 'produtos encontrados'}
            </strong>
          </div>
        )}

      {/* CONTEÚDO */}

      <section className={styles.productsSection}>
        {carregando && (
          <div className={styles.state}>
            <span>CARREGANDO</span>
            <strong>
              Preparando a lojinha...
            </strong>
          </div>
        )}

        {!carregando && erro && (
          <div className={styles.state}>
            <span>OPS</span>
            <strong>{erro}</strong>
          </div>
        )}

        {!carregando &&
          !erro &&
          produtosFiltrados.length === 0 && (
            <div className={styles.state}>
              <span>NENHUM RESULTADO</span>
              <strong>
                Não encontramos esse produto.
              </strong>
            </div>
          )}

        {!carregando &&
          !erro &&
          produtosFiltrados.length > 0 && (
            <div className={styles.grid}>
              {produtosFiltrados.map(
                (produto, index) => (
                  <article
                    key={produto.id}
                    className={styles.card}
                  >
                    <div className={styles.cardImage}>
                      <span
                        className={
                          styles.cardNumber
                        }
                      >
                        {String(index + 1).padStart(
                          2,
                          '0',
                        )}
                      </span>

                      {produto.image_url ? (
                        <Image
                          src={produto.image_url}
                          alt={produto.name}
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
                            strokeWidth={1.4}
                          />

                          <span>
                            FOTO EM BREVE
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        className={styles.favorite}
                        aria-label={`Favoritar ${produto.name}`}
                      >
                        <Heart
                          size={17}
                          strokeWidth={1.8}
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

                      <h2>{produto.name}</h2>

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
                            produto.stock <= 0
                          }
                          onClick={() =>
                            adicionarAoCarrinho(
                              produto,
                            )
                          }
                          title={
                            produto.stock <= 0
                              ? 'Produto sem estoque'
                              : 'Adicionar ao carrinho'
                          }
                        >
                          <span>
                            {produto.stock > 0
                              ? 'Adicionar'
                              : 'Esgotado'}
                          </span>

                          {produto.stock > 0 && (
                            <ArrowUpRight
                              size={16}
                              strokeWidth={2.2}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
      </section>

      {/* RODAPÉ */}

      <footer className={styles.footer}>
        <span>
          BELO CÃO · ESTÉTICA ANIMAL · PET COFFEE
        </span>

        <span>FEITO PARA ELES</span>
      </footer>

      {/* MODAL DE DESCRIÇÃO */}

      {produtoDescricao && (
        <div
          className={
            styles.descriptionOverlay
          }
          onClick={() =>
            setProdutoDescricao(null)
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
                setProdutoDescricao(null)
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
              {produtoDescricao.category}
            </span>

            <h2 id="descricao-produto">
              {produtoDescricao.name}
            </h2>

            <p>
              {produtoDescricao.description}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          CARRINHO
          ===================================================== */}

      <Carrinho
        aberto={carrinhoAberto}
        onFechar={() =>
          setCarrinhoAberto(false)
        }
        itens={carrinho}
        onAumentar={aumentarQuantidade}
        onDiminuir={diminuirQuantidade}
        onRemover={removerDoCarrinho}
        onFinalizar={finalizarPedido}
      />
    </main>
  )
}
