'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUpRight,
  Heart,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'

import styles from './Hero.module.css'

export function Hero() {
  return (
    <section
      id="inicio"
      className={styles.hero}
      aria-label="Belo Cão — Estética Animal e Pet Coffee"
    >
      {/* =====================================================
          ELEMENTOS DECORATIVOS
          ===================================================== */}

      <div
        className={styles.shapeLarge}
        aria-hidden="true"
      />

      <div
        className={styles.shapeMedium}
        aria-hidden="true"
      />

      <div
        className={styles.shapeSmall}
        aria-hidden="true"
      />

      <div
        className={styles.dotPattern}
        aria-hidden="true"
      />

      <div
        className={styles.circlePattern}
        aria-hidden="true"
      />

      {/* =====================================================
          LINHA SUPERIOR
          ===================================================== */}

      <div className={styles.introLine}>
        <span>BELO CÃO</span>

        <i aria-hidden="true" />

        <span>
          ESTÉTICA ANIMAL · PET COFFEE · LOJINHA
        </span>
      </div>

      {/* =====================================================
          CONTEÚDO PRINCIPAL
          ===================================================== */}

      <div className={styles.main}>
        {/* ===================================================
            CONTEÚDO
            =================================================== */}

        <div className={styles.content}>
          {/* =================================================
              EYEBROW
              ================================================= */}

          <div className={styles.eyebrow}>
            <span
              className={styles.eyebrowIcon}
              aria-hidden="true"
            >
              <Heart
                size={13}
                fill="currentColor"
                strokeWidth={2}
              />
            </span>

            <span>Um lugar para eles</span>

            <span
              className={styles.eyebrowLine}
              aria-hidden="true"
            />
          </div>

          {/* =================================================
              TÍTULO
              ================================================= */}

          <h1>
            <span>CUIDAR</span>

            <span className={styles.highlight}>
              É
            </span>

            <span>FICAR.</span>
          </h1>

          {/* =================================================
              TEXTO
              ================================================= */}

          <p className={styles.lead}>
            Banho, tosa, cuidado e café.

            <strong>
              {' '}
              Um lugar onde eles ficam bem
              e você também.
            </strong>
          </p>

          {/* =================================================
              AÇÕES
              ================================================= */}

          <div className={styles.actions}>
            <a
              href="#especialidades"
              className={styles.primaryButton}
              aria-label="Conhecer as especialidades do Belo Cão"
            >
              <span>
                conhecer o Belo Cão
              </span>

              <span
                className={styles.buttonIcon}
                aria-hidden="true"
              >
                <ArrowUpRight
                  size={18}
                  strokeWidth={2.4}
                />
              </span>
            </a>

            <Link
              href="/loja"
              className={styles.secondaryAction}
              aria-label="Visitar a lojinha do Belo Cão"
            >
              <ShoppingBag
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />

              <span>conhecer a lojinha</span>
            </Link>
          </div>
        </div>

        {/* ===================================================
            VISUAL PRINCIPAL
            =================================================== */}

        <div
          className={styles.visual}
          aria-label="Espaço do Belo Cão"
        >
          {/* =================================================
              LABEL
              ================================================= */}

          <div
            className={styles.photoLabel}
            aria-hidden="true"
          >
            <span>01</span>

            <strong>AQUI</strong>
          </div>

          {/* =================================================
              FOTO PRINCIPAL
              ================================================= */}

          <div className={styles.photo}>
            <Image
              src="/images/cao-cliente.jpg"
              alt="Cão cliente no espaço Belo Cão"
              fill
              priority
              sizes="(max-width: 700px) 100vw, (max-width: 1050px) 55vw, 50vw"
            />

            <div
              className={styles.photoOverlay}
              aria-hidden="true"
            />
          </div>

          {/* =================================================
              STICKER
              ================================================= */}

          <div
            className={styles.sticker}
            aria-hidden="true"
          >
            <Sparkles
              size={18}
              strokeWidth={2}
            />

            <span>UM LUGAR</span>

            <strong>DIFERENTE</strong>
          </div>

          {/* =================================================
              NOTE
              ================================================= */}

          <div
            className={styles.note}
            aria-hidden="true"
          >
            <Heart
              size={15}
              strokeWidth={2}
              fill="currentColor"
            />

            <span>eles gostam daqui</span>
          </div>
        </div>
      </div>

      {/* =====================================================
          RODAPÉ DO HERO
          ===================================================== */}

      <div className={styles.bottom}>
        <div
          className={styles.serviceList}
          aria-label="Serviços e experiências"
        >
          <span>banho</span>

          <i aria-hidden="true" />

          <span>tosa</span>

          <i aria-hidden="true" />

          <span>comportamento</span>

          <i aria-hidden="true" />

          <span>café</span>

          <i aria-hidden="true" />

          <span>lojinha</span>
        </div>

        <a
          href="#especialidades"
          className={styles.explore}
          aria-label="Descobrir as especialidades do Belo Cão"
        >
          <span>descobrir</span>

          <ArrowDown
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
        </a>
      </div>
    </section>
  )
}