
'use client'

import { useState } from 'react'

import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'

import styles from './Carrinho.module.css'

import Checkout, {
  type PedidoFinalizado,
} from '@/app/components/Checkout/Checkout'

export type ItemCarrinho = {
  id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
}

type CarrinhoProps = {
  aberto: boolean
  onFechar: () => void
  itens: ItemCarrinho[]
  onAumentar: (id: string) => void
  onDiminuir: (id: string) => void
  onRemover: (id: string) => void
  onFinalizar: (
    pedido: PedidoFinalizado
  ) => void
}

export default function Carrinho({
  aberto,
  onFechar,
  itens,
  onAumentar,
  onDiminuir,
  onRemover,
  onFinalizar,
}: CarrinhoProps) {
  const [checkoutAberto, setCheckoutAberto] =
    useState(false)

  const totalItens = itens.reduce(
    (total, item) =>
      total + item.quantity,
    0
  )

  const total = itens.reduce(
    (total, item) =>
      total +
      item.price * item.quantity,
    0
  )

  function formatarPreco(
    valor: number
  ) {
    return valor.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL',
      }
    )
  }

  /*
   * ============================================================
   * ABRIR CHECKOUT
   * ============================================================
   */

  function iniciarCheckout() {
    if (itens.length === 0) {
      return
    }

    setCheckoutAberto(true)
  }

  /*
   * ============================================================
   * VOLTAR PARA SACOLA
   *
   * NÃO APAGA O CARRINHO.
   * ============================================================
   */

  function voltarParaSacola() {
    setCheckoutAberto(false)
  }

  /*
   * ============================================================
   * PEDIDO FINALIZADO
   *
   * A Loja faz a ação final.
   * A Loja também é responsável por limpar o carrinho.
   * ============================================================
   */

  function pedidoFinalizado(
    pedido: PedidoFinalizado
  ) {
    onFinalizar(pedido)
  }

  /*
   * ============================================================
   * FECHAR
   *
   * Fechar NÃO apaga o carrinho.
   * ============================================================
   */

  function fecharCarrinho() {
    setCheckoutAberto(false)
    onFechar()
  }

  if (!aberto) {
    return null
  }

  return (
    <>
      <div
        className={styles.overlay}
        onClick={fecharCarrinho}
        aria-hidden="true"
      />

      <aside
        className={styles.carrinho}
        aria-label="Carrinho de compras"
      >
        <header
          className={styles.header}
        >
          <div>
            <span
              className={styles.eyebrow}
            >
              BELO CÃO
            </span>

            <h2>
              {checkoutAberto
                ? 'Finalizar pedido'
                : 'Sua sacola'}

              {!checkoutAberto &&
                totalItens > 0 && (
                  <span>
                    {totalItens}
                  </span>
                )}
            </h2>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={fecharCarrinho}
            aria-label="Fechar carrinho"
          >
            <X size={19} />
          </button>
        </header>

        {checkoutAberto ? (
          <Checkout
            itens={itens}
            total={total}
            onVoltarParaSacola={
              voltarParaSacola
            }
            onPedidoFinalizado={
              pedidoFinalizado
            }
          />
        ) : itens.length === 0 ? (
          <div className={styles.vazio}>
            <div
              className={
                styles.vazioIcon
              }
            >
              <ShoppingBag
                size={28}
              />
            </div>

            <span>
              BELO CÃO
            </span>

            <h3
              style={{
                margin:
                  '10px 0 0',
                color:
                  '#43205f',
                fontSize:
                  '22px',
                lineHeight:
                  '1.1',
                fontWeight:
                  800,
                letterSpacing:
                  '-0.04em',
              }}
            >
              Sua sacola está vazia
            </h3>

            <p>
              Adicione alguns produtos
              para continuar.
            </p>

            <button
              type="button"
              className={styles.continuar}
              onClick={fecharCarrinho}
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div
              className={styles.itens}
            >
              {itens.map((item) => (
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
                        src={
                          item.image_url
                        }
                        alt={item.name}
                      />
                    ) : (
                      <ShoppingBag
                        size={20}
                      />
                    )}
                  </div>

                  <div
                    className={
                      styles.itemInfo
                    }
                  >
                    <h3>
                      {item.name}
                    </h3>

                    <strong>
                      {formatarPreco(
                        item.price
                      )}
                    </strong>

                    <div
                      className={
                        styles.itemBottom
                      }
                    >
                      <div
                        className={
                          styles.quantidade
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onDiminuir(
                              item.id
                            )
                          }
                          aria-label={`Diminuir quantidade de ${item.name}`}
                        >
                          <Minus
                            size={14}
                          />
                        </button>

                        <span>
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onAumentar(
                              item.id
                            )
                          }
                          aria-label={`Aumentar quantidade de ${item.name}`}
                        >
                          <Plus
                            size={14}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.remover
                    }
                    onClick={() =>
                      onRemover(
                        item.id
                      )
                    }
                    aria-label={`Remover ${item.name}`}
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </article>
              ))}
            </div>

            <div
              className={styles.resumo}
            >
              <div
                className={
                  styles.linha
                }
              >
                <span>
                  {totalItens === 1
                    ? '1 item'
                    : `${totalItens} itens`}
                </span>

                <strong>
                  {formatarPreco(
                    total
                  )}
                </strong>
              </div>

              <div
                className={styles.total}
              >
                <span>
                  Total
                </span>

                <strong>
                  {formatarPreco(
                    total
                  )}
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.finalizar
                }
                onClick={
                  iniciarCheckout
                }
                disabled={
                  itens.length === 0
                }
              >
                Finalizar pedido
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
