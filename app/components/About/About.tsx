'use client'

import Image from 'next/image'
import {
  ArrowUpRight,
  Coffee,
  Heart,
} from 'lucide-react'

import styles from './About.module.css'

export function About() {
  return (
    <section
      id="sobre"
      className={styles.about}
    >
      <div
        className={styles.backgroundShape}
        aria-hidden="true"
      />

      <div className={styles.sectionTop}>
        <span className={styles.sectionNumber}>
          02
        </span>

        <span
          className={styles.sectionLine}
          aria-hidden="true"
        />

        <span className={styles.sectionLabel}>
          O Belo Cão
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.imageArea}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/logo-belocao.jpg"
              alt="Espaço do Belo Cão Estética Animal & Pet Shop Café"
              width={900}
              height={720}
              sizes="(max-width: 768px) 100vw, (max-width: 1100px) 48vw, 620px"
            />
          </div>

          <div className={styles.imageTag}>
            <Heart
              size={17}
              strokeWidth={2}
            />

            <span>
              feito para eles
            </span>
          </div>

          <span className={styles.imageNumber}>
            02
          </span>
        </div>

        <div className={styles.textArea}>
          <div className={styles.eyebrow}>
            <span aria-hidden="true" />
            MAIS QUE BANHO E TOSA
          </div>

          <h2>
            Um lugar onde
            <br />
            <em>eles gostam de ficar.</em>
          </h2>

          <p>
            O Belo Cão nasceu para deixar o cuidado
            dos pets mais leve, mais próximo e muito
            mais divertido.
          </p>

          <p>
            Enquanto eles tomam banho, fazem a tosa
            ou aprendem alguma coisa nova, você pode
            ficar por aqui, tomar um café, conversar,
            conhecer a lojinha ou simplesmente esperar
            sem pressa.
          </p>

          <div className={styles.experience}>
            <div className={styles.experienceIcon}>
              <Coffee
                size={19}
                strokeWidth={1.9}
              />
            </div>

            <div className={styles.experienceText}>
              <strong>
                Eles cuidam.
                <br />
                Você aproveita.
              </strong>

              <span>
                Pet Coffee + estética animal
              </span>
            </div>
          </div>

          <a
            href="#especialidades"
            className={styles.moreLink}
          >
            <span>
              conhecer nossos cuidados
            </span>

            <span className={styles.linkIcon}>
              <ArrowUpRight
                size={17}
                strokeWidth={2}
              />
            </span>
          </a>
        </div>
      </div>

      <div className={styles.bottomPhrase}>
        <span>cuidado</span>

        <i aria-hidden="true" />

        <strong>carinho</strong>

        <i aria-hidden="true" />

        <span>café</span>

        <i aria-hidden="true" />

        <span>companhia</span>
      </div>
    </section>
  )
}