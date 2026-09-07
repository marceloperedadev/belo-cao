'use client'

import { ArrowUp } from 'lucide-react'
import { Config } from '@/app/constants/config'
import styles from './Footer.module.css'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      {/* Formas decorativas */}
      <div
        className={styles.shapeOne}
        aria-hidden="true"
      />

      <div
        className={styles.shapeTwo}
        aria-hidden="true"
      />

      {/* =====================================================
          ÁREA PRINCIPAL
          ===================================================== */}

      <div className={styles.footerMain}>
        {/* Marca */}

        <div className={styles.brand}>
          <a
            href="#inicio"
            className={styles.brandLink}
            aria-label="Voltar ao início"
          >
            <span
              className={styles.brandMark}
              aria-hidden="true"
            >
              <span className={styles.eyeLeft} />
              <span className={styles.eyeRight} />
              <span className={styles.nose} />
            </span>

            <span className={styles.brandText}>
              <strong>BELO CÃO</strong>

              <small>
                estética animal · pet coffee
              </small>
            </span>
          </a>
        </div>

        {/* Mensagem central */}

        <div className={styles.message}>
          <span>feito para eles.</span>

          <strong>
            gostoso para
            <br />
            você também.
          </strong>
        </div>

        {/* Instagram */}

        <div className={styles.social}>
          <a
            href={Config.INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.instagram}
            aria-label="Instagram do Belo Cão"
          >
            <span
              className={styles.instagramIcon}
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <circle
                  cx="17.5"
                  cy="6.5"
                  r="1"
                  fill="currentColor"
                />
              </svg>
            </span>

            <span>Instagram</span>

            <ArrowUp
              size={16}
              strokeWidth={2.2}
              className={styles.instagramArrow}
              aria-hidden="true"
            />
          </a>
        </div>
      </div>

      {/* =====================================================
          BARRA INFERIOR
          ===================================================== */}

      <div className={styles.footerBottom}>
        {/* Copyright */}

        <span className={styles.copyright}>
          © {currentYear} Belo Cão. Todos os direitos reservados.
        </span>

        {/* Assinatura central no desktop */}

        <span className={styles.bottomCenter}>
          ESTÉTICA ANIMAL · PET COFFEE · LOJINHA
        </span>

        {/* Voltar ao topo */}

        <a
          href="#inicio"
          className={styles.backTop}
          aria-label="Voltar ao topo"
        >
          <span>voltar ao topo</span>

          <span
            className={styles.backTopIcon}
            aria-hidden="true"
          >
            <ArrowUp
              size={15}
              strokeWidth={2.4}
            />
          </span>
        </a>

        {/* Assinatura do desenvolvedor */}

        <a
          href="https://marcelopereda.dev"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.developerSignature}
          aria-label="Desenvolvido por marcelopereda.dev"
        >
          marcelopereda.dev
        </a>
      </div>
    </footer>
  )
}