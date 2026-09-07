'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  User,
} from 'lucide-react'

import styles from './Checkout.module.css'

import type { ItemCarrinho } from '@/app/components/Carrinho/Carrinho'

export type TipoEntrega =
  | 'entrega'
  | 'retirada'

export type ClienteCheckout = {
  nome: string
  whatsapp: string

  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export type PedidoFinalizado = {
  cliente: ClienteCheckout
  tipoEntrega: TipoEntrega
}

type Etapa =
  | 'cliente'
  | 'entrega'
  | 'revisao'

type CheckoutProps = {
  itens: ItemCarrinho[]
  total: number
  onVoltarParaSacola: () => void
  onPedidoFinalizado: (
    pedido: PedidoFinalizado
  ) => void
}

export default function Checkout({
  itens,
  total,
  onVoltarParaSacola,
  onPedidoFinalizado,
}: CheckoutProps) {
  const [etapa, setEtapa] =
    useState<Etapa>('cliente')

  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const [tipoEntrega, setTipoEntrega] =
    useState<TipoEntrega | null>(null)

  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] =
    useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')

  const [erro, setErro] = useState('')

  /* =========================================================
     FORMATAÇÕES
     ========================================================= */

  function formatarPreco(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatarWhatsapp(valor: string) {
    const numeros = valor
      .replace(/\D/g, '')
      .slice(0, 11)

    if (numeros.length <= 2) {
      return numeros
    }

    if (numeros.length <= 7) {
      return `(${numeros.slice(
        0,
        2
      )}) ${numeros.slice(2)}`
    }

    return `(${numeros.slice(
      0,
      2
    )}) ${numeros.slice(
      2,
      7
    )}-${numeros.slice(7, 11)}`
  }

  function formatarCep(valor: string) {
    const numeros = valor
      .replace(/\D/g, '')
      .slice(0, 8)

    if (numeros.length <= 5) {
      return numeros
    }

    return `${numeros.slice(
      0,
      5
    )}-${numeros.slice(5)}`
  }

  /* =========================================================
     VALIDAÇÃO DO PASSO 1
     ========================================================= */

  function continuarCliente() {
    setErro('')

    const nomeLimpo = nome.trim()

    const telefoneLimpo =
      whatsapp.replace(/\D/g, '')

    if (nomeLimpo.length < 2) {
      setErro(
        'Informe seu nome para continuar.'
      )
      return
    }

    if (
      telefoneLimpo.length < 10 ||
      telefoneLimpo.length > 11
    ) {
      setErro(
        'Informe um WhatsApp válido com DDD.'
      )
      return
    }

    setNome(nomeLimpo)

    setWhatsapp(
      formatarWhatsapp(whatsapp)
    )

    setEtapa('entrega')
  }

  /* =========================================================
     VALIDAÇÃO DO ENDEREÇO
     ========================================================= */

  function enderecoValido() {
    const cepLimpo =
      cep.replace(/\D/g, '')

    const ufLimpa =
      uf.trim().toUpperCase()

    return (
      cepLimpo.length === 8 &&
      rua.trim().length >= 2 &&
      numero.trim().length >= 1 &&
      bairro.trim().length >= 2 &&
      cidade.trim().length >= 2 &&
      ufLimpa.length === 2
    )
  }

  /* =========================================================
     PASSO 2
     ========================================================= */

  function continuarEntrega() {
    setErro('')

    if (!tipoEntrega) {
      setErro(
        'Escolha como você deseja receber o pedido.'
      )
      return
    }

    /*
     * ENTREGA:
     * o endereço é obrigatório.
     */

    if (tipoEntrega === 'entrega') {
      if (!enderecoValido()) {
        setErro(
          'Preencha corretamente o endereço de entrega para continuar.'
        )
        return
      }
    }

    setEtapa('revisao')
  }

  /* =========================================================
     VOLTAR
     ========================================================= */

  function voltarParaCliente() {
    setErro('')
    setEtapa('cliente')
  }

  function voltarParaEntrega() {
    setErro('')
    setEtapa('entrega')
  }

  /* =========================================================
     CLIENTE FINAL
     ========================================================= */

  const cliente = useMemo<ClienteCheckout>(
    () => ({
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),

      cep: cep.trim(),
      rua: rua.trim(),
      numero: numero.trim(),
      complemento: complemento.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim().toUpperCase(),
    }),
    [
      nome,
      whatsapp,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
    ]
  )

  /* =========================================================
     FINALIZAR PEDIDO
     ========================================================= */

  function finalizarPedido() {
    setErro('')

    if (!tipoEntrega) {
      setErro(
        'Escolha como deseja receber o pedido.'
      )

      setEtapa('entrega')
      return
    }

    if (
      tipoEntrega === 'entrega' &&
      !enderecoValido()
    ) {
      setErro(
        'O endereço de entrega está incompleto.'
      )

      setEtapa('entrega')
      return
    }

    if (itens.length === 0) {
      setErro(
        'Sua sacola está vazia.'
      )
      return
    }

    onPedidoFinalizado({
      cliente,
      tipoEntrega,
    })
  }

  /* =========================================================
     PASSO 1 — CLIENTE
     ========================================================= */

  function renderCliente() {
    return (
      <section className={styles.step}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNumber}>
            1
          </span>

          <div>
            <span className={styles.stepLabel}>
              PASSO 1 DE 3
            </span>

            <h3>Seus dados</h3>

            <p>
              Precisamos de alguns dados para
              identificar seu pedido.
            </p>
          </div>
        </div>

        <div className={styles.form}>
          <label className={styles.field}>
            <span>
              <User size={15} />
              Nome
            </span>

            <input
              type="text"
              value={nome}
              onChange={(event) =>
                setNome(event.target.value)
              }
              placeholder="Seu nome"
              autoComplete="name"
            />
          </label>

          <label className={styles.field}>
            <span>
              <Phone size={15} />
              WhatsApp
            </span>

            <input
              type="tel"
              value={whatsapp}
              onChange={(event) =>
                setWhatsapp(
                  formatarWhatsapp(
                    event.target.value
                  )
                )
              }
              placeholder="(12) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
        </div>

        {erro && (
          <p className={styles.error}>
            {erro}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.backButton}
            onClick={onVoltarParaSacola}
          >
            <ArrowLeft size={17} />
            Voltar para a sacola
          </button>

          <button
            type="button"
            className={styles.continuar}
            onClick={continuarCliente}
          >
            Continuar
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    )
  }

  /* =========================================================
     PASSO 2 — ENTREGA / RETIRADA
     ========================================================= */

  function renderEntrega() {
    return (
      <section className={styles.step}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNumber}>
            2
          </span>

          <div>
            <span className={styles.stepLabel}>
              PASSO 2 DE 3
            </span>

            <h3>
              Como você quer receber?
            </h3>

            <p>
              Escolha entre receber seu pedido
              ou retirar na loja.
            </p>
          </div>
        </div>

        <div className={styles.deliveryOptions}>
          <button
            type="button"
            className={
              tipoEntrega === 'entrega'
                ? styles.deliveryOptionActive
                : styles.deliveryOption
            }
            onClick={() => {
              setTipoEntrega('entrega')
              setErro('')
            }}
          >
            <div
              className={styles.deliveryIcon}
            >
              <MapPin size={21} />
            </div>

            <div>
              <strong>Entrega</strong>

              <span>
                Receba seu pedido no endereço
                informado.
              </span>
            </div>

            {tipoEntrega === 'entrega' && (
              <Check
                size={19}
                className={
                  styles.deliveryCheck
                }
              />
            )}
          </button>

          <button
            type="button"
            className={
              tipoEntrega === 'retirada'
                ? styles.deliveryOptionActive
                : styles.deliveryOption
            }
            onClick={() => {
              setTipoEntrega('retirada')
              setErro('')
            }}
          >
            <div
              className={styles.deliveryIcon}
            >
              <Store size={21} />
            </div>

            <div>
              <strong>
                Retirada na loja
              </strong>

              <span>
                Retire seu pedido diretamente
                na loja.
              </span>
            </div>

            {tipoEntrega === 'retirada' && (
              <Check
                size={19}
                className={
                  styles.deliveryCheck
                }
              />
            )}
          </button>
        </div>

        {tipoEntrega === 'entrega' && (
          <div className={styles.address}>
            <div
              className={
                styles.addressTitle
              }
            >
              <MapPin size={17} />

              <div>
                <strong>
                  Endereço de entrega
                </strong>

                <span>
                  Informe onde deseja receber
                  seu pedido.
                </span>
              </div>
            </div>

            <div
              className={
                styles.addressGrid
              }
            >
              <label
                className={`${styles.field} ${styles.cepField}`}
              >
                <span>CEP</span>

                <input
                  type="text"
                  value={cep}
                  onChange={(event) =>
                    setCep(
                      formatarCep(
                        event.target.value
                      )
                    )
                  }
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </label>

              <label
                className={`${styles.field} ${styles.ruaField}`}
              >
                <span>Rua</span>

                <input
                  type="text"
                  value={rua}
                  onChange={(event) =>
                    setRua(
                      event.target.value
                    )
                  }
                  placeholder="Nome da rua"
                  autoComplete="street-address"
                />
              </label>

              <label
                className={styles.field}
              >
                <span>Número</span>

                <input
                  type="text"
                  value={numero}
                  onChange={(event) =>
                    setNumero(
                      event.target.value
                    )
                  }
                  placeholder="123"
                  inputMode="numeric"
                />
              </label>

              <label
                className={styles.field}
              >
                <span>
                  Complemento
                </span>

                <input
                  type="text"
                  value={complemento}
                  onChange={(event) =>
                    setComplemento(
                      event.target.value
                    )
                  }
                  placeholder="Apto, bloco..."
                  autoComplete="address-line2"
                />
              </label>

              <label
                className={styles.field}
              >
                <span>Bairro</span>

                <input
                  type="text"
                  value={bairro}
                  onChange={(event) =>
                    setBairro(
                      event.target.value
                    )
                  }
                  placeholder="Seu bairro"
                  autoComplete="address-level3"
                />
              </label>

              <label
                className={styles.field}
              >
                <span>Cidade</span>

                <input
                  type="text"
                  value={cidade}
                  onChange={(event) =>
                    setCidade(
                      event.target.value
                    )
                  }
                  placeholder="Sua cidade"
                  autoComplete="address-level2"
                />
              </label>

              <label
                className={styles.field}
              >
                <span>UF</span>

                <input
                  type="text"
                  value={uf}
                  onChange={(event) =>
                    setUf(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 2)
                    )
                  }
                  placeholder="SP"
                  maxLength={2}
                  autoComplete="address-level1"
                />
              </label>
            </div>
          </div>
        )}

        {tipoEntrega === 'retirada' && (
          <div
            className={styles.pickupInfo}
          >
            <Store size={20} />

            <div>
              <strong>
                Retirada na loja
              </strong>

              <p>
                Na próxima etapa vamos
                mostrar as informações
                para retirada.
              </p>
            </div>
          </div>
        )}

        {erro && (
          <p className={styles.error}>
            {erro}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.backButton}
            onClick={voltarParaCliente}
          >
            <ArrowLeft size={17} />
            Voltar
          </button>

          <button
            type="button"
            className={styles.continuar}
            onClick={continuarEntrega}
            disabled={!tipoEntrega}
          >
            Continuar
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    )
  }

  /* =========================================================
     PASSO 3 — REVISÃO
     ========================================================= */

  function renderRevisao() {
    return (
      <section className={styles.step}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNumber}>
            3
          </span>

          <div>
            <span className={styles.stepLabel}>
              PASSO 3 DE 3
            </span>

            <h3>
              Revise seu pedido
            </h3>

            <p>
              Confira os dados antes de
              finalizar.
            </p>
          </div>
        </div>

        <div className={styles.review}>
          {/* CLIENTE */}

          <div
            className={styles.reviewBlock}
          >
            <div
              className={
                styles.reviewBlockHeader
              }
            >
              <User size={17} />

              <strong>
                Seus dados
              </strong>

              <button
                type="button"
                onClick={
                  voltarParaCliente
                }
              >
                Editar
              </button>
            </div>

            <p>{cliente.nome}</p>

            <span>
              {cliente.whatsapp}
            </span>
          </div>

          {/* ENTREGA / RETIRADA */}

          <div
            className={styles.reviewBlock}
          >
            <div
              className={
                styles.reviewBlockHeader
              }
            >
              {tipoEntrega ===
              'entrega' ? (
                <MapPin size={17} />
              ) : (
                <Store size={17} />
              )}

              <strong>
                {tipoEntrega ===
                'entrega'
                  ? 'Endereço de entrega'
                  : 'Retirada na loja'}
              </strong>

              <button
                type="button"
                onClick={
                  voltarParaEntrega
                }
              >
                Editar
              </button>
            </div>

            {tipoEntrega ===
            'entrega' ? (
              <div
                className={
                  styles.reviewAddress
                }
              >
                <p>
                  {cliente.rua},{' '}
                  {cliente.numero}
                  {cliente.complemento
                    ? ` — ${cliente.complemento}`
                    : ''}
                </p>

                <span>
                  {cliente.bairro}
                  {' · '}
                  {cliente.cidade} -{' '}
                  {cliente.uf}
                </span>

                <span>
                  CEP: {cliente.cep}
                </span>
              </div>
            ) : (
              <div
                className={
                  styles.reviewAddress
                }
              >
                <p>
                  Retirada diretamente na
                  loja.
                </p>

                <span>
                  As informações para
                  retirada serão apresentadas
                  após a confirmação.
                </span>
              </div>
            )}
          </div>

          {/* PEDIDO */}

          <div
            className={styles.reviewBlock}
          >
            <div
              className={
                styles.reviewBlockHeader
              }
            >
              <ShoppingBag size={17} />

              <strong>
                Resumo do pedido
              </strong>
            </div>

            <div
              className={
                styles.reviewItems
              }
            >
              {itens.map((item) => (
                <div
                  key={item.id}
                  className={
                    styles.reviewItem
                  }
                >
                  <span>
                    {item.quantity}x{' '}
                    {item.name}
                  </span>

                  <strong>
                    {formatarPreco(
                      item.price *
                        item.quantity
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div
              className={
                styles.reviewTotal
              }
            >
              <span>Total</span>

              <strong>
                {formatarPreco(total)}
              </strong>
            </div>
          </div>
        </div>

        {erro && (
          <p className={styles.error}>
            {erro}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.backButton}
            onClick={
              voltarParaEntrega
            }
          >
            <ArrowLeft size={17} />
            Voltar
          </button>

          <button
            type="button"
            className={styles.continuar}
            onClick={finalizarPedido}
          >
            Finalizar pedido
            <Check size={17} />
          </button>
        </div>
      </section>
    )
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className={styles.checkout}>
      {etapa === 'cliente' &&
        renderCliente()}

      {etapa === 'entrega' &&
        renderEntrega()}

      {etapa === 'revisao' &&
        renderRevisao()}
    </div>
  )
}