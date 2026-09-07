
'use client'

import {
  ArrowUpRight,
  Clock,
  Coffee,
  MapPin,
  Phone,
} from 'lucide-react'

import { Config } from '@/app/constants/config'
import styles from './Location.module.css'

export function Location() {
  return (
    <section
      id="localizacao"
      className={styles.locationSection}
    >
      <div
        className={styles.shapeOne}
        aria-hidden="true"
      />

      <div
        className={styles.shapeTwo}
        aria-hidden="true"
      />

      <div className={styles.locationContainer}>

        <div className={styles.sectionIntro}>

          <div className={styles.eyebrow}>
            <span aria-hidden="true" />
            vem encontrar a gente
          </div>

          <h2>
            Onde o cuidado
            <br />
            <em>acontece.</em>
          </h2>

          <p>
            Um cantinho diferente em Taubaté.
            Você traz eles, a gente cuida deles
            e o café fica por nossa conta.
          </p>

        </div>

        <div className={styles.locationContent}>

          <div className={styles.locationInfo}>

            <div className={styles.infoTop}>
              <span className={styles.infoNumber}>
                01
              </span>

              <span className={styles.infoLabel}>
                BELO CÃO
              </span>
            </div>

            <div className={styles.infoList}>

              <div className={styles.infoItem}>

                <div className={styles.iconBox}>
                  <MapPin
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>

                <div className={styles.infoText}>
                  <strong>
                    Onde estamos
                  </strong>

                  <p>
                    {Config.ADDRESS || 'Taubaté — SP'}
                  </p>
                </div>

              </div>

              <div className={styles.infoItem}>

                <div className={styles.iconBox}>
                  <Phone
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>

                <div className={styles.infoText}>
                  <strong>
                    Fala com a gente
                  </strong>

                  <p>
                    {Config.PHONE || 'WhatsApp'}
                  </p>
                </div>

              </div>

              <div className={styles.infoItem}>

                <div className={styles.iconBox}>
                  <Clock
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>

                <div className={styles.infoText}>
                  <strong>
                    Quando encontrar a gente
                  </strong>

                  <p>
                    {Config.OPENING_HOURS ||
                      'Consulte nossos horários'}
                  </p>
                </div>

              </div>

            </div>

            <div className={styles.coffeeNote}>

              <div className={styles.coffeeIcon}>
                <Coffee
                  size={20}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>

              <div>
                <strong>
                  Chegou cedo?
                </strong>

                <p>
                  Fica por aqui. Tem café,
                  tem lojinha e tem um lugar
                  gostoso para esperar.
                </p>
              </div>

            </div>

            <a
              href={Config.WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.locationCta}
              aria-label="Falar com o Belo Cão pelo WhatsApp"
            >
              <span>
                falar com a gente
              </span>

              <span className={styles.ctaIcon}>
                <ArrowUpRight
                  size={18}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>
            </a>

          </div>

          <div className={styles.locationMap}>

            <div className={styles.mapTop}>

              <div>
                <span className={styles.mapNumber}>
                  02
                </span>

                <strong>
                  como chegar
                </strong>
              </div>

              <MapPin
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />

            </div>

            <div className={styles.mapFrame}>

              <iframe
                src={Config.GOOGLE_MAPS_EMBED_URL}
                title="Localização do Belo Cão"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />

              <div className={styles.mapBadge}>
                <MapPin
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <span>
                  BELO CÃO
                </span>
              </div>

            </div>

          </div>

        </div>

        <div className={styles.locationFooter}>
          <span>chegou</span>
          <span>cuidou</span>
          <span>tomou um café</span>
          <span>foi feliz</span>
        </div>

      </div>
    </section>
  )
}

