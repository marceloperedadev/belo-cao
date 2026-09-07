'use client'

import { Heart, Coffee, Scissors, Sparkles } from 'lucide-react'
import styles from './TrustStrip.module.css'

const TRUST_ITEMS = [
  {
    icon: Heart,
    value: 'Cuidado',
    label: 'feito para cada pet',
  },
  {
    icon: Scissors,
    value: 'Banho & Tosa',
    label: 'com atenção aos detalhes',
  },
  {
    icon: Coffee,
    value: 'Pet Coffee',
    label: 'enquanto você espera',
  },
  {
    icon: Sparkles,
    value: 'Belo Cão',
    label: 'um lugar diferente',
  },
]

export function TrustStrip() {
  return (
    <section
      className={styles.trustStrip}
      aria-label="Diferenciais do Belo Cão"
    >
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon

        return (
          <div key={item.value}>
            <div className={styles.icon}>
              <Icon
                size={17}
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>

            <strong>{item.value}</strong>

            <span>{item.label}</span>
          </div>
        )
      })}
    </section>
  )
}