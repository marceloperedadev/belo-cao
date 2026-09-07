'use client'

import {
  ArrowUpRight,
  Coffee,
  Heart,
  Sparkles,
} from 'lucide-react'

import { Config } from '@/app/constants/config'
import styles from './Contact.module.css'

export function Contact() {
  return (
    <section id="contato" className={styles.contactCta}>

      {/* =====================================================
          FORMAS DECORATIVAS
          ===================================================== */}

      <div
        className={styles.shapeLarge}
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


      {/* =====================================================
          MARCAÇÃO
          ===================================================== */}

      <div className={styles.eyebrow}>
        <span className={styles.eyebrowIcon}>
          <Heart size={13} fill="currentColor" />
        </span>

        <span>Até a próxima parada</span>

        <span className={styles.eyebrowLine} />
      </div>


      {/* =====================================================
          TÍTULO
          ===================================================== */}

      <h2>
        Vai deixar seu
        <br />
        <span>pet por aqui?</span>
      </h2>


      {/* =====================================================
          DESCRIÇÃO
          ===================================================== */}

      <p>
        Então já sabe: eles cuidam, você respira,
        toma um café e aproveita o tempo.
        <strong> A gente espera vocês.</strong>
      </p>


      {/* =====================================================
          AÇÕES
          ===================================================== */}

      <div className={styles.actions}>

        <a
          href={Config.WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.primaryButton}
          aria-label="Falar com o Belo Cão pelo WhatsApp"
        >
          <span>falar com a gente</span>

          <span className={styles.buttonIcon}>
            <ArrowUpRight
              size={18}
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </span>
        </a>

      </div>


      {/* =====================================================
          MINI EXPERIÊNCIAS
          ===================================================== */}

      <div className={styles.bottomInfo}>

        <div className={styles.infoItem}>
          <Sparkles
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          <span>eles ficam bem</span>
        </div>

        <div className={styles.infoDivider} />

        <div className={styles.infoItem}>
          <Coffee
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          <span>você fica também</span>
        </div>

      </div>


      {/* =====================================================
          ASSINATURA
          ===================================================== */}

      <div className={styles.signature}>
        <span>BELO CÃO</span>
        <small>ESTÉTICA ANIMAL · PET COFFEE · LOJINHA</small>
      </div>

    </section>
  )
}