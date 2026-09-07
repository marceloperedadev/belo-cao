
'use client'

import {
  Bath,
  Coffee,
  Heart,
} from 'lucide-react'

import styles from './Experience.module.css'

export function Experience() {
  return (
    <section
      id="experiencia"
      className={styles.experience}
    >
      <div className={styles.header}>
        <div className={styles.eyebrow}>
          <span aria-hidden="true" />
          COMO FUNCIONA POR AQUI
        </div>

        <h2>
          Eles aproveitam.
          <br />
          <em>Você também.</em>
        </h2>

        <p>
          O Belo Cão foi pensado para que o momento
          do cuidado seja gostoso para todo mundo.
        </p>
      </div>

      <ol className={styles.experienceList}>
        <li className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.number}>
              01
            </span>

            <div className={styles.icon}>
              <Bath
                size={21}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>
              PARA ELES
            </span>

            <strong>
              Banho, tosa
              <br />
              e cuidado.
            </strong>

            <small>
              Estética animal feita com calma,
              carinho e atenção ao que cada
              pet precisa.
            </small>
          </div>
        </li>

        <li className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.number}>
              02
            </span>

            <div className={styles.icon}>
              <Heart
                size={21}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>
              NO TEMPO DELES
            </span>

            <strong>
              Cuidado que
              <br />
              respeita.
            </strong>

            <small>
              Comportamento animal e uma rotina
              pensada para deixar a experiência
              mais tranquila.
            </small>
          </div>
        </li>

        <li
          className={`${styles.card} ${styles.cardPurple}`}
        >
          <div className={styles.cardTop}>
            <span className={styles.number}>
              03
            </span>

            <div className={styles.icon}>
              <Coffee
                size={21}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>
              PARA VOCÊ
            </span>

            <strong>
              Um café enquanto
              <br />
              eles ficam bem.
            </strong>

            <small>
              Espere sem pressa, tome um café,
              dê uma olhada na lojinha ou
              simplesmente fique por aqui.
            </small>
          </div>
        </li>
      </ol>

      <div className={styles.footer}>
        <span>cuidado</span>

        <i aria-hidden="true" />

        <span>tempo</span>

        <i aria-hidden="true" />

        <strong>companhia</strong>

        <i aria-hidden="true" />

        <span>café</span>
      </div>
    </section>
  )
}
