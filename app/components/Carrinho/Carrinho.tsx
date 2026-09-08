'use client'

import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'

import styles from './Carrinho.module.css'

export type ProdutoCarrinho = {
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

export type ItemCarrinho = ProdutoCarrinho & {
  quantidade: number
}

type CarrinhoProps = {
  aberto: boolean
  itens: ItemCarrinho[]
  onFechar: () => void
  onAumentar: (id: string) => void
  onDiminuir: (id: string) => void
  onRemover: (id: string) => void
  onContinuarComprando: () => void
  onFinalizar: () => void
}

export default function Carrinho({
  aberto,
  itens,
  onFechar,
  onAumentar,
  onDiminuir,
  onRemover,
  onContinuarComprando,
  onFinalizar,
}: CarrinhoProps) {
  if (!aberto) return null

  const quantidadeTotal = itens.reduce(
    (total, item) => {
      const quantidade = Number(item.quantidade)

      return (
        total +
        (Number.isFinite(quantidade) && quantidade > 0
          ? Math.floor(quantidade)
          : 1)
      )
    },
    0,
  )

  const valorTotal = itens.reduce(
    (total, item) => {
      const preco = Number(item.price)
      const quantidade = Number(item.quantidade)

      const precoSeguro = Number.isFinite(preco)
        ? preco
        : 0

      const quantidadeSegura =
        Number.isFinite(quantidade) && quantidade > 0
          ? Math.floor(quantidade)
          : 1

      return (
        total +
        precoSeguro * quantidadeSegura
      )
    },
    0,
  )

  function formatarPreco(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function quantidadeSegura(item: ItemCarrinho) {
    const quantidade = Number(item.quantidade)

    if (
      !Number.isFinite(quantidade) ||
      quantidade <= 0
    ) {
      return 1
    }

    return Math.floor(quantidade)
  }

  return (
    <div
      className={styles.overlay}
      onClick={onFechar}
    >
      <aside
        className={styles.carrinho}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-carrinho"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.eyebrow}>
              SEU PEDIDO
            </span>

            <div className={styles.titleRow}>
              <ShoppingBag
                size={21}
                strokeWidth={1.8}
              />

              <h2 id="titulo-carrinho">
                Carrinho
              </h2>

              {quantidadeTotal > 0 && (
                <span className={styles.badge}>
                  {quantidadeTotal}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onFechar}
            aria-label="Fechar carrinho"
          >
            <X
              size={20}
              strokeWidth={1.9}
            />
          </button>
        </header>

        <div className={styles.content}>
          {itens.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <ShoppingBag
                  size={31}
                  strokeWidth={1.35}
                />
              </div>

              <span className={styles.emptyEyebrow}>
                CARRINHO VAZIO
              </span>

              <h3>
                Seu carrinho
                <br />
                está esperando.
              </h3>

              <p>
                Escolha seus produtos favoritos
                e eles aparecerão aqui.
              </p>

              <button
                type="button"
                className={styles.emptyButton}
                onClick={
                  onContinuarComprando
                }
              >
                <span>
                  Ver produtos
                </span>

                <ArrowRight
                  size={16}
                  strokeWidth={2}
                />
              </button>
            </div>
          ) : (
            <>
              <div
                className={styles.itemsHeader}
              >
                <span>
                  {quantidadeTotal === 1
                    ? '1 item'
                    : `${quantidadeTotal} itens`}
                </span>

                <span>
                  SEU PEDIDO
                </span>
              </div>

              <div className={styles.items}>
                {itens.map((item) => {
                  const preco = Number(
                    item.price,
                  )

                  const precoSeguro =
                    Number.isFinite(preco)
                      ? preco
                      : 0

                  const quantidade =
                    quantidadeSegura(item)

                  const subtotal =
                    precoSeguro * quantidade

                  const estoque =
                    Number(item.stock)

                  const estoqueSeguro =
                    Number.isFinite(estoque) &&
                    estoque > 0
                      ? Math.floor(estoque)
                      : 0

                  const quantidadeMaxima =
                    estoqueSeguro > 0
                      ? estoqueSeguro
                      : quantidade

                  return (
                    <article
                      key={item.id}
                      className={styles.item}
                    >
                      <div
                        className={
                          styles.itemImage
                        }
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                          />
                        ) : (
                          <ShoppingBag
                            size={23}
                            strokeWidth={1.3}
                          />
                        )}
                      </div>

                      <div
                        className={
                          styles.itemInfo
                        }
                      >
                        <span
                          className={
                            styles.itemCategory
                          }
                        >
                          {item.category}
                        </span>

                        <h3>
                          {item.name}
                        </h3>

                        <span
                          className={
                            styles.itemPrice
                          }
                        >
                          {formatarPreco(
                            precoSeguro,
                          )}
                        </span>

                        <div
                          className={
                            styles.itemActions
                          }
                        >
                          <div
                            className={
                              styles.quantity
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onDiminuir(
                                  item.id,
                                )
                              }
                              disabled={
                                quantidade <= 1
                              }
                              aria-label={`Diminuir quantidade de ${item.name}`}
                            >
                              <Minus
                                size={14}
                                strokeWidth={2}
                              />
                            </button>

                            <span>
                              {quantidade}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                onAumentar(
                                  item.id,
                                )
                              }
                              disabled={
                                quantidade >=
                                quantidadeMaxima
                              }
                              aria-label={`Aumentar quantidade de ${item.name}`}
                            >
                              <Plus
                                size={14}
                                strokeWidth={2}
                              />
                            </button>
                          </div>

                          <button
                            type="button"
                            className={
                              styles.remove
                            }
                            onClick={() =>
                              onRemover(
                                item.id,
                              )
                            }
                          >
                            <Trash2
                              size={14}
                              strokeWidth={1.8}
                            />

                            <span>
                              Remover
                            </span>
                          </button>
                        </div>
                      </div>

                      <strong
                        className={
                          styles.itemSubtotal
                        }
                      >
                        {formatarPreco(
                          subtotal,
                        )}
                      </strong>
                    </article>
                  )
                })}
              </div>

              <button
                type="button"
                className={
                  styles.continueButton
                }
                onClick={
                  onContinuarComprando
                }
              >
                <ArrowLeft
                  size={15}
                  strokeWidth={2}
                />

                <span>
                  Continuar comprando
                </span>
              </button>
            </>
          )}
        </div>

        {itens.length > 0 && (
          <footer className={styles.footer}>
            <div
              className={styles.summary}
            >
              <div
                className={
                  styles.summaryRow
                }
              >
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatarPreco(
                    valorTotal,
                  )}
                </strong>
              </div>

              <div
                className={
                  styles.summaryNote
                }
              >
                <span
                  className={
                    styles.noteDot
                  }
                />

                <span>
                  Frete e forma de entrega
                  definidos no checkout.
                </span>
              </div>
            </div>

            <button
              type="button"
              className={
                styles.checkoutButton
              }
              onClick={onFinalizar}
            >
              <span>
                Finalizar pedido
              </span>

              <div
                className={
                  styles.checkoutValue
                }
              >
                <strong>
                  {formatarPreco(
                    valorTotal,
                  )}
                </strong>

                <ArrowRight
                  size={17}
                  strokeWidth={2}
                />
              </div>
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}