
'use client'

import {
  Award,
  Heart,
} from 'lucide-react'

import styles from './Testimonial.module.css'

export function Testimonial() {
  return (
    <section className={styles.testimonial}>

      <div className={styles.testimonialQuoteWrapper}>

        <div className={styles.eyebrow}>
          <Heart
            size={15}
            strokeWidth={2}
            aria-hidden="true"
          />

          <span>
            Do nosso jeito
          </span>
        </div>

        <blockquote>
          “Aqui, cada pet é tratado como único.
          A gente cuida, observa e respeita
          o tempo de cada um.”
        </blockquote>

        <div className={styles.signatureDetails}>
          <p>
            Porque cuidar bem também é fazer
            eles se sentirem em casa.
          </p>
        </div>

      </div>

      <div className={styles.testimonialAuthorCard}>

        <div className={styles.testimonialAuthor}>

          <span
            className={styles.avatar}
            aria-hidden="true"
          >
            BC
          </span>

          <div className={styles.authorMeta}>
            <strong>
              Belo Cão
            </strong>

            <small>
              Estética Animal · Pet Coffee
            </small>
          </div>

        </div>

        <div className={styles.verifiedBadge}>
          <Award
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />

          <span>
            Cuidado de verdade
          </span>
        </div>

      </div>

    </section>
  )
}

