'use client'

import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  PawPrint,
  ShieldCheck,
} from 'lucide-react'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import { useRouter } from 'next/navigation'

import styles from './Login.module.css'

/* =========================================================
   BELO CÃO
   LOGIN ADMINISTRATIVO
   ========================================================= */

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [mostrarSenha, setMostrarSenha] =
    useState(false)

  const [carregando, setCarregando] =
    useState(false)

  const [verificandoSessao, setVerificandoSessao] =
    useState(true)

  const [erro, setErro] = useState('')

  /* =======================================================
     VERIFICAR SE JÁ ESTÁ LOGADO
     ======================================================= */

  useEffect(() => {
    let ativo = true

    async function verificarSessao() {
      try {
        const resposta = await fetch(
          '/api/admin/auth/me',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        if (!ativo) return

        if (resposta.ok) {
          router.replace('/admin/pedidos')
          return
        }
      } catch {
        // Se falhar, simplesmente permanece no login.
      } finally {
        if (ativo) {
          setVerificandoSessao(false)
        }
      }
    }

    verificarSessao()

    return () => {
      ativo = false
    }
  }, [router])

  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (carregando) return

    setErro('')

    const emailLimpo =
      email.trim().toLowerCase()

    if (!emailLimpo || !senha) {
      setErro(
        'Informe o e-mail e a senha.',
      )
      return
    }

    setCarregando(true)

    try {
      const resposta = await fetch(
        '/api/admin/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: emailLimpo,
            senha,
          }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(
          dados?.erro ||
            'Não foi possível entrar.',
        )
        return
      }

      /*
       * O token NÃO é salvo no localStorage.
       *
       * O servidor criou um cookie HttpOnly.
       */

      router.replace('/admin/pedidos')

      router.refresh()
    } catch {
      setErro(
        'Não foi possível conectar ao servidor.',
      )
    } finally {
      setCarregando(false)
    }
  }

  /* =======================================================
     TELA DE VERIFICAÇÃO
     ======================================================= */

  if (verificandoSessao) {
    return (
      <main className={styles.pagina}>
        <div className={styles.verificando}>
          <Loader2
            size={22}
            className={styles.spinner}
          />

          <span>
            Verificando acesso...
          </span>
        </div>
      </main>
    )
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  return (
    <main className={styles.pagina}>
      <div className={styles.container}>
        <section className={styles.loginCard}>
          {/* =================================================
             MARCA
             ================================================= */}

          <div className={styles.marca}>
            <div className={styles.logo}>
              <PawPrint size={22} />
            </div>

            <div>
              <strong>BELO CÃO</strong>

              <span>
                PAINEL ADMINISTRATIVO
              </span>
            </div>
          </div>

          {/* =================================================
             CABEÇALHO
             ================================================= */}

          <div className={styles.cabecalho}>
            <div className={styles.iconeSeguranca}>
              <ShieldCheck size={18} />
            </div>

            <div>
              <span className={styles.eyebrow}>
                ACESSO RESTRITO
              </span>

              <h1>
                Entrar no painel
              </h1>

              <p>
                Acesse o gerenciamento da
                loja Belo Cão.
              </p>
            </div>
          </div>

          {/* =================================================
             FORMULÁRIO
             ================================================= */}

          <form
            className={styles.formulario}
            onSubmit={handleSubmit}
          >
            <div className={styles.campo}>
              <label htmlFor="email">
                E-mail
              </label>

              <div className={styles.inputWrapper}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  disabled={carregando}
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.campo}>
              <label htmlFor="senha">
                Senha
              </label>

              <div className={styles.inputWrapper}>
                <LockKeyhole
                  size={17}
                  className={styles.inputIcon}
                />

                <input
                  id="senha"
                  name="senha"
                  type={
                    mostrarSenha
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(event) =>
                    setSenha(event.target.value)
                  }
                  disabled={carregando}
                />

                <button
                  type="button"
                  className={styles.mostrarSenha}
                  onClick={() =>
                    setMostrarSenha(
                      (valor) => !valor,
                    )
                  }
                  aria-label={
                    mostrarSenha
                      ? 'Ocultar senha'
                      : 'Mostrar senha'
                  }
                  disabled={carregando}
                >
                  {mostrarSenha ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* =================================================
               ERRO
               ================================================= */}

            {erro && (
              <div
                className={styles.erro}
                role="alert"
              >
                <span>{erro}</span>
              </div>
            )}

            {/* =================================================
               BOTÃO
               ================================================= */}

            <button
              type="submit"
              className={styles.botaoEntrar}
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <Loader2
                    size={18}
                    className={styles.spinner}
                  />

                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={18} />

                  Entrar no painel
                </>
              )}
            </button>
          </form>

          {/* =================================================
             RODAPÉ
             ================================================= */}

          <div className={styles.rodape}>
            <LockKeyhole size={14} />

            <span>
              Área protegida · Acesso somente
              para administradores
            </span>
          </div>
        </section>
      </div>
    </main>
  )
}