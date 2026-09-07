'use client'

import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import styles from './Carrinho.module.css'

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
onFinalizar: () => void
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
const totalItens = itens.reduce(
(total, item) => total + item.quantity,
0,
)

const total = itens.reduce(
(total, item) => total + item.price * item.quantity,
0,
)

function formatarPreco(valor: number) {
return valor.toLocaleString('pt-BR', {
style: 'currency',
currency: 'BRL',
})
}

if (!aberto) {
return null
}

return (
<> <div
     className={styles.overlay}
     onClick={onFechar}
     aria-hidden="true"
   />


  <aside
    className={styles.carrinho}
    aria-label="Carrinho de compras"
  >
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>
          SEU PEDIDO
        </span>

        <h2>
          Sacola
          <span>{totalItens}</span>
        </h2>
      </div>

      <button
        type="button"
        className={styles.close}
        onClick={onFechar}
        aria-label="Fechar carrinho"
      >
        <X size={19} />
      </button>
    </header>

    {itens.length === 0 ? (
      <div className={styles.vazio}>
        <div className={styles.vazioIcon}>
          <ShoppingBag size={30} strokeWidth={1.4} />
        </div>

        <span>SUA SACOLA ESTÁ VAZIA</span>

        <p>
          Escolha alguns produtos para começar
          seu pedido.
        </p>

        <button
          type="button"
          onClick={onFechar}
          className={styles.continuar}
        >
          Continuar comprando
        </button>
      </div>
    ) : (
      <>
        <div className={styles.itens}>
          {itens.map((item) => (
            <article
              key={item.id}
              className={styles.item}
            >
              <div className={styles.itemImage}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                  />
                ) : (
                  <ShoppingBag
                    size={20}
                    strokeWidth={1.4}
                  />
                )}
              </div>

              <div className={styles.itemInfo}>
                <h3>{item.name}</h3>

                <strong>
                  {formatarPreco(item.price)}
                </strong>

                <div className={styles.itemBottom}>
                  <div className={styles.quantidade}>
                    <button
                      type="button"
                      onClick={() =>
                        onDiminuir(item.id)
                      }
                      aria-label={`Diminuir quantidade de ${item.name}`}
                    >
                      <Minus size={13} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        onAumentar(item.id)
                      }
                      aria-label={`Aumentar quantidade de ${item.name}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.remover}
                    onClick={() =>
                      onRemover(item.id)
                    }
                    aria-label={`Remover ${item.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.resumo}>
          <div className={styles.linha}>
            <span>Subtotal</span>
            <strong>{formatarPreco(total)}</strong>
          </div>

          <div className={styles.linha}>
            <span>Entrega</span>
            <span className={styles.aDefinir}>
              A definir
            </span>
          </div>

          <div className={styles.total}>
            <span>Total</span>
            <strong>{formatarPreco(total)}</strong>
          </div>

          <button
            type="button"
            className={styles.finalizar}
            onClick={onFinalizar}
          >
            Finalizar pedido
          </button>

          <button
            type="button"
            className={styles.continuar}
            onClick={onFechar}
          >
            Continuar comprando
          </button>
        </div>
      </>
    )}
  </aside>
</>


)
}
