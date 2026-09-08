'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  ShoppingBag,
  Store,
  User,
  Wallet,
  X,
} from 'lucide-react'

import { useEffect, useMemo, useState } from 'react'

import styles from './Checkout.module.css'

import type {
  ItemCarrinho,
} from '../Carrinho/Carrinho'

type CheckoutProps = {
  aberto: boolean
  itens: ItemCarrinho[]
  onFechar: () => void
  onVoltarCarrinho: () => void
  onPedidoFinalizado?: () => void
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
  referencia: string
}

type FormaEntrega =
  | 'entrega'
  | 'retirada'

type FormaPagamento =
  | 'pix'
  | 'dinheiro'
  | 'cartao'

const INITIAL_CLIENTE: Cliente = {
  nome: '',
  whatsapp: '',

  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  referencia: '',
}

function somenteNumeros(
  valor: string,
) {
  return valor.replace(/\D/g, '')
}

function formatarWhatsApp(
  valor: string,
) {
  const numeros =
    somenteNumeros(valor).slice(
      0,
      11,
    )

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

function formatarCEP(
  valor: string,
) {
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

function formatarMoeda(
  valor: string,
) {
  const numeros =
    somenteNumeros(valor)

  if (!numeros) {
    return ''
  }

  const numero =
    Number(numeros) / 100

  if (!Number.isFinite(numero)) {
    return ''
  }

  return numero.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  )
}

function obterValorMoeda(
  valor: string,
) {
  const numeros =
    somenteNumeros(valor)

  if (!numeros) {
    return 0
  }

  const numero =
    Number(numeros) / 100

  return Number.isFinite(
    numero,
  )
    ? numero
    : 0
}

function formatarPreco(
  valor: number,
) {
  return valor.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  )
}

export default function Checkout({
  aberto,
  itens,
  onFechar,
  onVoltarCarrinho,
  onPedidoFinalizado,
}: CheckoutProps) {
  const [etapa, setEtapa] =
    useState(1)

  const [cliente, setCliente] =
    useState<Cliente>(
      INITIAL_CLIENTE,
    )

  const [
    formaEntrega,
    setFormaEntrega,
  ] = useState<FormaEntrega>(
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

  const [erro, setErro] =
    useState('')

  const [enviando, setEnviando] =
    useState(false)

  /* =========================================================
     CONFIGURAÇÕES
     ========================================================= */

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(
      /\D/g,
      '',
    ) ?? ''

  const enderecoLoja =
    process.env
      .NEXT_PUBLIC_STORE_ADDRESS?.trim() ??
    ''

  /* =========================================================
     VALORES
     ========================================================= */

  const quantidadeTotal =
    useMemo(() => {
      return itens.reduce(
        (total, item) => {
          const quantidade =
            Number(
              item.quantidade,
            )

          return (
            total +
            (Number.isFinite(
              quantidade,
            ) &&
            quantidade > 0
              ? Math.floor(
                  quantidade,
                )
              : 1)
          )
        },
        0,
      )
    }, [itens])

  const subtotal =
    useMemo(() => {
      return itens.reduce(
        (total, item) => {
          const preco =
            Number(item.price)

          const quantidade =
            Number(
              item.quantidade,
            )

          const precoSeguro =
            Number.isFinite(
              preco,
            )
              ? preco
              : 0

          const quantidadeSegura =
            Number.isFinite(
              quantidade,
            ) &&
            quantidade > 0
              ? Math.floor(
                  quantidade,
                )
              : 1

          return (
            total +
            precoSeguro *
              quantidadeSegura
          )
        },
        0,
      )
    }, [itens])

  /*
    O frete ainda não é calculado automaticamente.
    Ele será confirmado no WhatsApp.
  */
  const frete = 0

  const total = subtotal + frete

  /* =========================================================
     BLOQUEAR SCROLL
     ========================================================= */

  useEffect(() => {
    if (!aberto) {
      return
    }

    const overflowAnterior =
      document.body.style
        .overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        overflowAnterior
    }
  }, [aberto])

  /* =========================================================
     ESC PARA FECHAR
     ========================================================= */

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

  /* =========================================================
     ATUALIZAR CLIENTE
     ========================================================= */

  function atualizarCliente(
    campo: keyof Cliente,
    valor: string,
  ) {
    setCliente((atual) => ({
      ...atual,
      [campo]: valor,
    }))

    setErro('')
  }

  /* =========================================================
     VALIDAÇÃO ETAPA 1
     ========================================================= */

  function validarCliente() {
    const nome =
      cliente.nome.trim()

    const whatsapp =
      somenteNumeros(
        cliente.whatsapp,
      )

    if (nome.length < 2) {
      setErro(
        'Informe seu nome para continuar.',
      )

      return false
    }

    if (
      whatsapp.length < 10
    ) {
      setErro(
        'Informe um WhatsApp válido para continuar.',
      )

      return false
    }

    return true
  }

  /* =========================================================
     VALIDAÇÃO ETAPA 2
     ========================================================= */

  function validarEntrega() {
    if (
      formaEntrega ===
      'retirada'
    ) {
      return true
    }

    const cep =
      somenteNumeros(
        cliente.cep,
      )

    if (cep.length !== 8) {
      setErro(
        'Informe um CEP válido.',
      )

      return false
    }

    if (
      cliente.rua.trim()
        .length < 2
    ) {
      setErro(
        'Informe a rua ou avenida.',
      )

      return false
    }

    if (
      cliente.numero.trim()
        .length === 0
    ) {
      setErro(
        'Informe o número do endereço.',
      )

      return false
    }

    if (
      cliente.bairro.trim()
        .length < 2
    ) {
      setErro(
        'Informe o bairro.',
      )

      return false
    }

    if (
      cliente.cidade.trim()
        .length < 2
    ) {
      setErro(
        'Informe a cidade.',
      )

      return false
    }

    return true
  }

  /* =========================================================
     VALIDAÇÃO ETAPA 3
     ========================================================= */

  function validarPagamento() {
    if (
      formaPagamento !==
      'dinheiro'
    ) {
      return true
    }

    const valorTroco =
      obterValorMoeda(
        trocoPara,
      )

    if (
      !trocoPara ||
      valorTroco <= 0
    ) {
      setErro(
        'Informe o valor para o qual precisa de troco.',
      )

      return false
    }

    if (
      valorTroco < total
    ) {
      setErro(
        'O valor para troco precisa ser igual ou maior que o total do pedido.',
      )

      return false
    }

    return true
  }

  /* =========================================================
     AVANÇAR
     ========================================================= */

  function continuar() {
    setErro('')

    if (etapa === 1) {
      if (!validarCliente()) {
        return
      }

      setEtapa(2)
      return
    }

    if (etapa === 2) {
      if (!validarEntrega()) {
        return
      }

      setEtapa(3)
      return
    }

    if (etapa === 3) {
      if (!validarPagamento()) {
        return
      }

      enviarPedidoWhatsApp()
    }
  }

  /* =========================================================
     VOLTAR
     ========================================================= */

  function voltar() {
    setErro('')

    if (etapa === 1) {
      onVoltarCarrinho()
      return
    }

    setEtapa(
      (atual) =>
        Math.max(
          1,
          atual - 1,
        ),
    )
  }

  /* =========================================================
     TEXTO DA ENTREGA
     ========================================================= */

  function obterTextoEntrega() {
    if (
      formaEntrega ===
      'retirada'
    ) {
      return 'Retirada na loja'
    }

    const partes = [
      cliente.rua.trim(),
      cliente.numero.trim(),
    ].filter(Boolean)

    const linhaPrincipal =
      partes.join(', ')

    const linhaSecundaria = [
      cliente.bairro.trim(),
      cliente.cidade.trim(),
    ].filter(Boolean)

    const endereco =
      [
        linhaPrincipal,
        linhaSecundaria.join(
          ' — ',
        ),
      ]
        .filter(Boolean)
        .join(' · ')

    return endereco ||
      'Entrega'
  }

  /* =========================================================
     TEXTO PAGAMENTO
     ========================================================= */

  function obterTextoPagamento() {
    if (
      formaPagamento ===
      'pix'
    ) {
      return 'Pix'
    }

    if (
      formaPagamento ===
      'dinheiro'
    ) {
      const valor =
        obterValorMoeda(
          trocoPara,
        )

      if (valor > 0) {
        return `Dinheiro — troco para ${formatarPreco(
          valor,
        )}`
      }

      return 'Dinheiro'
    }

    return 'Cartão'
  }

  /* =========================================================
     MONTAR PEDIDO
     ========================================================= */

  function montarMensagemWhatsApp() {
    const linhas: string[] =
      []

    linhas.push(
      '*NOVO PEDIDO — BELO CÃO*',
    )

    linhas.push('')

    linhas.push(
      '*DADOS DO CLIENTE*',
    )

    linhas.push(
      `Nome: ${cliente.nome.trim()}`,
    )

    linhas.push(
      `WhatsApp: ${cliente.whatsapp.trim()}`,
    )

    linhas.push('')

    linhas.push(
      '*ITENS DO PEDIDO*',
    )

    itens.forEach((item) => {
      const preco =
        Number(item.price)

      const precoSeguro =
        Number.isFinite(
          preco,
        )
          ? preco
          : 0

      const quantidade =
        Number(
          item.quantidade,
        )

      const quantidadeSegura =
        Number.isFinite(
          quantidade,
        ) &&
        quantidade > 0
          ? Math.floor(
              quantidade,
            )
          : 1

      const subtotalItem =
        precoSeguro *
        quantidadeSegura

      linhas.push(
        `${quantidadeSegura}x ${item.name}`,
      )

      linhas.push(
        `   ${formatarPreco(
          precoSeguro,
        )} un. — ${formatarPreco(
          subtotalItem,
        )}`,
      )
    })

    linhas.push('')

    linhas.push(
      `*Subtotal: ${formatarPreco(
        subtotal,
      )}*`,
    )

    linhas.push('')

    linhas.push(
      '*FORMA DE RECEBIMENTO*',
    )

    if (
      formaEntrega ===
      'entrega'
    ) {
      linhas.push(
        'Entrega',
      )

      linhas.push(
        `CEP: ${cliente.cep.trim()}`,
      )

      linhas.push(
        `Endereço: ${cliente.rua.trim()}, ${cliente.numero.trim()}`,
      )

      if (
        cliente.complemento.trim()
      ) {
        linhas.push(
          `Complemento: ${cliente.complemento.trim()}`,
        )
      }

      linhas.push(
        `Bairro: ${cliente.bairro.trim()}`,
      )

      linhas.push(
        `Cidade: ${cliente.cidade.trim()}`,
      )

      if (
        cliente.referencia.trim()
      ) {
        linhas.push(
          `Referência: ${cliente.referencia.trim()}`,
        )
      }

      linhas.push(
        'Frete: a confirmar',
      )
    } else {
      linhas.push(
        'Retirada na loja',
      )

      if (enderecoLoja) {
        linhas.push(
          `Local: ${enderecoLoja}`,
        )
      }
    }

    linhas.push('')

    linhas.push(
      '*FORMA DE PAGAMENTO*',
    )

    linhas.push(
      obterTextoPagamento(),
    )

    linhas.push('')

    linhas.push(
      `*TOTAL DOS PRODUTOS: ${formatarPreco(
        total,
      )}*`,
    )

    if (
      formaEntrega ===
      'entrega'
    ) {
      linhas.push(
        'Frete será confirmado no atendimento.',
      )
    }

    linhas.push('')

    linhas.push(
      'Pedido enviado pelo site Belo Cão.',
    )

    return linhas.join('\n')
  }

  /* =========================================================
     ENVIAR WHATSAPP
     ========================================================= */

  function enviarPedidoWhatsApp() {
    if (itens.length === 0) {
      setErro(
        'Seu carrinho está vazio.',
      )

      return
    }

    if (!whatsappNumber) {
      setErro(
        'O WhatsApp da loja ainda não foi configurado.',
      )

      return
    }

    setEnviando(true)
    setErro('')

    try {
      const mensagem =
        montarMensagemWhatsApp()

      const url =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          mensagem,
        )}`

      const janela =
        window.open(
          url,
          '_blank',
          'noopener,noreferrer',
        )

      if (!janela) {
        setErro(
          'O navegador bloqueou a abertura do WhatsApp. Permita pop-ups e tente novamente.',
        )

        setEnviando(false)

        return
      }

      if (
        onPedidoFinalizado
      ) {
        onPedidoFinalizado()
      }
    } catch (error) {
      console.error(
        'Erro ao enviar pedido:',
        error,
      )

      setErro(
        'Não foi possível abrir o WhatsApp. Tente novamente.',
      )

      setEnviando(false)
    }
  }

  /* =========================================================
     FECHADO
     ========================================================= */

  if (!aberto) {
    return null
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div
      className={
        styles.overlay
      }
      onClick={() => {
        if (!enviando) {
          onFechar()
        }
      }}
    >
      <section
        className={
          styles.checkout
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(event) =>
          event.stopPropagation()
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
              styles.headerTop
            }
          >
            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={voltar}
              disabled={enviando}
              aria-label={
                etapa === 1
                  ? 'Voltar para o carrinho'
                  : 'Voltar etapa'
              }
            >
              <ArrowLeft
                size={17}
                strokeWidth={2}
              />

              <span>
                {etapa === 1
                  ? 'Carrinho'
                  : 'Voltar'}
              </span>
            </button>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={onFechar}
              disabled={enviando}
              aria-label="Fechar checkout"
            >
              <X
                size={19}
                strokeWidth={1.9}
              />
            </button>
          </div>

          <div
            className={
              styles.headerContent
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              FINALIZAR PEDIDO
            </span>

            <h1 id="checkout-title">
              {etapa === 1 &&
                'Seus dados.'}

              {etapa === 2 &&
                'Como você recebe?'}

              {etapa === 3 &&
                'Como você paga?'}
            </h1>

            <p>
              {etapa === 1 &&
                'Precisamos de alguns dados para preparar seu pedido.'}

              {etapa === 2 &&
                'Escolha entre receber seu pedido ou retirar na loja.'}

              {etapa === 3 &&
                'Escolha a forma de pagamento que prefere.'}
            </p>
          </div>

          {/* ================================================
              PROGRESSO
              ================================================ */}

          <div
            className={
              styles.progress
            }
          >
            {[1, 2, 3].map(
              (numero) => {
                const concluida =
                  numero <
                  etapa

                const atual =
                  numero ===
                  etapa

                return (
                  <div
                    key={numero}
                    className={`${styles.progressItem} ${
                      concluida
                        ? styles.progressDone
                        : ''
                    } ${
                      atual
                        ? styles.progressActive
                        : ''
                    }`}
                  >
                    <div
                      className={
                        styles.progressCircle
                      }
                    >
                      {concluida ? (
                        <Check
                          size={13}
                          strokeWidth={
                            2.5
                          }
                        />
                      ) : (
                        numero
                      )}
                    </div>

                    <span>
                      {numero ===
                        1 &&
                        'Dados'}

                      {numero ===
                        2 &&
                        'Entrega'}

                      {numero ===
                        3 &&
                        'Pagamento'}
                    </span>
                  </div>
                )
              },
            )}

            <div
              className={
                styles.progressLine
              }
            >
              <span
                style={{
                  width: `${
                    ((etapa - 1) /
                      2) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </header>

        {/* ===================================================
            CONTEÚDO
            =================================================== */}

        <div
          className={
            styles.body
          }
        >
          {/* =================================================
              ETAPA 1
              ================================================= */}

          {etapa === 1 && (
            <div
              className={
                styles.step
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <span>
                  01
                </span>

                <div>
                  <strong>
                    Seus dados
                  </strong>

                  <p>
                    Usaremos essas informações
                    para confirmar seu pedido.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.form
                }
              >
                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Nome completo
                  </span>

                  <div
                    className={
                      styles.inputWrap
                    }
                  >
                    <User
                      size={17}
                      strokeWidth={
                        1.8
                      }
                    />

                    <input
                      type="text"
                      value={
                        cliente.nome
                      }
                      onChange={(
                        event,
                      ) =>
                        atualizarCliente(
                          'nome',
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Como podemos chamar você?"
                      autoComplete="name"
                      autoFocus
                    />
                  </div>
                </label>

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    WhatsApp
                  </span>

                  <div
                    className={
                      styles.inputWrap
                    }
                  >
                    <Phone
                      size={17}
                      strokeWidth={
                        1.8
                      }
                    />

                    <input
                      type="tel"
                      inputMode="tel"
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
                </label>
              </div>

              <div
                className={
                  styles.infoBox
                }
              >
                <MessageCircle
                  size={17}
                  strokeWidth={
                    1.7
                  }
                />

                <div>
                  <strong>
                    Seu pedido será confirmado pelo WhatsApp
                  </strong>

                  <span>
                    Depois de enviar, a loja
                    poderá confirmar disponibilidade,
                    entrega e demais detalhes.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              ETAPA 2
              ================================================= */}

          {etapa === 2 && (
            <div
              className={
                styles.step
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <span>
                  02
                </span>

                <div>
                  <strong>
                    Como você quer receber?
                  </strong>

                  <p>
                    Escolha entre entrega ou retirada na loja.
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
                  className={`${styles.optionCard} ${
                    formaEntrega ===
                    'entrega'
                      ? styles.optionCardActive
                      : ''
                  }`}
                  onClick={() => {
                    setFormaEntrega(
                      'entrega',
                    )
                    setErro('')
                  }}
                >
                  <div
                    className={
                      styles.optionIcon
                    }
                  >
                    <Package
                      size={21}
                      strokeWidth={
                        1.7
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.optionContent
                    }
                  >
                    <strong>
                      Entrega
                    </strong>

                    <span>
                      Receba seu pedido
                      no endereço informado.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaEntrega ===
                      'entrega' && (
                      <i />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.optionCard} ${
                    formaEntrega ===
                    'retirada'
                      ? styles.optionCardActive
                      : ''
                  }`}
                  onClick={() => {
                    setFormaEntrega(
                      'retirada',
                    )
                    setErro('')
                  }}
                >
                  <div
                    className={
                      styles.optionIcon
                    }
                  >
                    <Store
                      size={21}
                      strokeWidth={
                        1.7
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.optionContent
                    }
                  >
                    <strong>
                      Retirada na loja
                    </strong>

                    <span>
                      Retire seu pedido
                      diretamente na loja.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaEntrega ===
                      'retirada' && (
                      <i />
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
                      size={17}
                      strokeWidth={
                        1.8
                      }
                    />

                    <div>
                      <strong>
                        Endereço de entrega
                      </strong>

                      <span>
                        Informe onde devemos entregar seu pedido.
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      styles.form
                    }
                  >
                    <div
                      className={
                        styles.formRow
                      }
                    >
                      <label
                        className={`${styles.field} ${styles.fieldSmall}`}
                      >
                        <span>
                          CEP
                        </span>

                        <div
                          className={
                            styles.inputWrap
                          }
                        >
                          <MapPin
                            size={16}
                            strokeWidth={
                              1.8
                            }
                          />

                          <input
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
                            placeholder="00000-000"
                            autoComplete="postal-code"
                          />
                        </div>
                      </label>

                      <label
                        className={
                          styles.field
                        }
                      >
                        <span>
                          Rua / Avenida
                        </span>

                        <div
                          className={
                            styles.inputWrap
                          }
                        >
                          <MapPin
                            size={16}
                            strokeWidth={
                              1.8
                            }
                          />

                          <input
                            type="text"
                            value={
                              cliente.rua
                            }
                            onChange={(
                              event,
                            ) =>
                              atualizarCliente(
                                'rua',
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder="Nome da rua"
                            autoComplete="street-address"
                          />
                        </div>
                      </label>
                    </div>

                    <div
                      className={
                        styles.formRow
                      }
                    >
                      <label
                        className={`${styles.field} ${styles.fieldSmall}`}
                      >
                        <span>
                          Número
                        </span>

                        <div
                          className={
                            styles.inputWrap
                          }
                        >
                          <span
                            className={
                              styles.inputMiniIcon
                            }
                          >
                            #
                          </span>

                          <input
                            type="text"
                            inputMode="numeric"
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
                      </label>

                      <label
                        className={
                          styles.field
                        }
                      >
                        <span>
                          Complemento
                          <em>
                            opcional
                          </em>
                        </span>

                        <div
                          className={
                            styles.inputWrap
                          }
                        >
                          <input
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
                            placeholder="Apto, casa, bloco..."
                            autoComplete="address-line2"
                          />
                        </div>
                      </label>
                    </div>

                    <div
                      className={
                        styles.formRow
                      }
                    >
                      <label
                        className={
                          styles.field
                        }
                      >
                        <span>
                          Bairro
                        </span>

                        <div
                          className={
                            styles.inputWrap
                          }
                        >
                          <input
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
                      </label>

                      <label
                        className={
                          styles.field
                        }
                      >
                        <span>
                          Cidade
                        </span>

                        <div
                          className={
                            styles.inputWrap
                          }
                        >
                          <input
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
                      </label>
                    </div>

                    <label
                      className={
                        styles.field
                      }
                    >
                      <span>
                        Referência
                        <em>
                          opcional
                        </em>
                      </span>

                      <div
                        className={
                          styles.inputWrap
                        }
                      >
                        <input
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
                          placeholder="Ex.: perto da praça..."
                        />
                      </div>
                    </label>
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
                  <div
                    className={
                      styles.pickupIcon
                    }
                  >
                    <Store
                      size={22}
                      strokeWidth={
                        1.7
                      }
                    />
                  </div>

                  <div>
                    <span>
                      RETIRADA NA LOJA
                    </span>

                    <strong>
                      Seu pedido ficará
                      disponível para retirada.
                    </strong>

                    <p>
                      {enderecoLoja ||
                        'Endereço da loja será informado na confirmação do pedido pelo WhatsApp.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================
              ETAPA 3
              ================================================= */}

          {etapa === 3 && (
            <div
              className={
                styles.step
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <span>
                  03
                </span>

                <div>
                  <strong>
                    Forma de pagamento
                  </strong>

                  <p>
                    Escolha como deseja pagar seu pedido.
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
                  className={`${styles.paymentCard} ${
                    formaPagamento ===
                    'pix'
                      ? styles.paymentCardActive
                      : ''
                  }`}
                  onClick={() => {
                    setFormaPagamento(
                      'pix',
                    )
                    setErro('')
                  }}
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
                      styles.optionContent
                    }
                  >
                    <strong>
                      Pix
                    </strong>

                    <span>
                      Pague pelo Pix após a confirmação do pedido.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaPagamento ===
                      'pix' && (
                      <i />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.paymentCard} ${
                    formaPagamento ===
                    'dinheiro'
                      ? styles.paymentCardActive
                      : ''
                  }`}
                  onClick={() => {
                    setFormaPagamento(
                      'dinheiro',
                    )
                    setErro('')
                  }}
                >
                  <div
                    className={
                      styles.paymentIcon
                    }
                  >
                    <Wallet
                      size={20}
                      strokeWidth={
                        1.7
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.optionContent
                    }
                  >
                    <strong>
                      Dinheiro
                    </strong>

                    <span>
                      Pague em dinheiro no recebimento.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaPagamento ===
                      'dinheiro' && (
                      <i />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.paymentCard} ${
                    formaPagamento ===
                    'cartao'
                      ? styles.paymentCardActive
                      : ''
                  }`}
                  onClick={() => {
                    setFormaPagamento(
                      'cartao',
                    )
                    setErro('')
                  }}
                >
                  <div
                    className={
                      styles.paymentIcon
                    }
                  >
                    <CreditCard
                      size={20}
                      strokeWidth={
                        1.7
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.optionContent
                    }
                  >
                    <strong>
                      Cartão
                    </strong>

                    <span>
                      Débito ou crédito, conforme disponibilidade.
                    </span>
                  </div>

                  <span
                    className={
                      styles.radio
                    }
                  >
                    {formaPagamento ===
                      'cartao' && (
                      <i />
                    )}
                  </span>
                </button>
              </div>

              {formaPagamento ===
                'dinheiro' && (
                <div
                  className={
                    styles.changeBox
                  }
                >
                  <div
                    className={
                      styles.changeHeader
                    }
                  >
                    <Wallet
                      size={17}
                      strokeWidth={
                        1.8
                      }
                    />

                    <div>
                      <strong>
                        Troco para quanto?
                      </strong>

                      <span>
                        Informe o valor em dinheiro que você entregará.
                      </span>
                    </div>
                  </div>

                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Valor para troco
                    </span>

                    <div
                      className={
                        styles.inputWrap
                      }
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          trocoPara
                        }
                        onChange={(
                          event,
                        ) => {
                          setTrocoPara(
                            formatarMoeda(
                              event
                                .target
                                .value,
                            ),
                          )

                          setErro('')
                        }}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </label>

                  {obterValorMoeda(
                    trocoPara,
                  ) >= total &&
                    obterValorMoeda(
                      trocoPara,
                    ) > 0 && (
                      <span
                        className={
                          styles.changeResult
                        }
                      >
                        Troco aproximado:{' '}
                        <strong>
                          {formatarPreco(
                            obterValorMoeda(
                              trocoPara,
                            ) -
                              total,
                          )}
                        </strong>
                      </span>
                    )}
                </div>
              )}

              {/* =============================================
                  RESUMO FINAL
                  ============================================= */}

              <div
                className={
                  styles.orderSummary
                }
              >
                <div
                  className={
                    styles.orderSummaryHeader
                  }
                >
                  <div>
                    <span>
                      RESUMO
                    </span>

                    <strong>
                      Seu pedido
                    </strong>
                  </div>

                  <span
                    className={
                      styles.itemCount
                    }
                  >
                    {quantidadeTotal}{' '}
                    {quantidadeTotal ===
                    1
                      ? 'item'
                      : 'itens'}
                  </span>
                </div>

                <div
                  className={
                    styles.summaryItems
                  }
                >
                  {itens.map(
                    (item) => {
                      const preco =
                        Number(
                          item.price,
                        )

                      const precoSeguro =
                        Number.isFinite(
                          preco,
                        )
                          ? preco
                          : 0

                      const quantidade =
                        Number(
                          item.quantidade,
                        )

                      const quantidadeSegura =
                        Number.isFinite(
                          quantidade,
                        ) &&
                        quantidade >
                          0
                          ? Math.floor(
                              quantidade,
                            )
                          : 1

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
                                quantidadeSegura
                              }
                              x
                            </strong>

                            <span>
                              {
                                item.name
                              }
                            </span>
                          </div>

                          <strong>
                            {formatarPreco(
                              precoSeguro *
                                quantidadeSegura,
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
                      {formatarPreco(
                        subtotal,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Frete
                    </span>

                    <strong>
                      {formaEntrega ===
                      'entrega'
                        ? 'A confirmar'
                        : '—'}
                    </strong>
                  </div>

                  <div
                    className={
                      styles.totalRow
                    }
                  >
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatarPreco(
                        total,
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
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
                !
              </span>

              <p>
                {erro}
              </p>
            </div>
          )}
        </div>

        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer
          className={
            styles.footer
          }
        >
          <div
            className={
              styles.footerTotal
            }
          >
            <span>
              TOTAL
            </span>

            <strong>
              {formatarPreco(
                total,
              )}
            </strong>
          </div>

          <button
            type="button"
            className={
              styles.continueButton
            }
            onClick={
              continuar
            }
            disabled={
              enviando ||
              itens.length ===
                0
            }
          >
            {enviando ? (
              <>
                <span
                  className={
                    styles.spinner
                  }
                />

                <span>
                  Abrindo WhatsApp...
                </span>
              </>
            ) : etapa === 3 ? (
              <>
                <MessageCircle
                  size={17}
                  strokeWidth={
                    2
                  }
                />

                <span>
                  Enviar pedido
                </span>

                <ArrowRight
                  size={17}
                  strokeWidth={
                    2
                  }
                />
              </>
            ) : (
              <>
                <span>
                  Continuar
                </span>

                <ArrowRight
                  size={17}
                  strokeWidth={
                    2
                  }
                />
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  )
}