
'use client'

import {
  ArrowUpRight,
  ChevronDown,
  Coffee,
  Heart,
} from 'lucide-react'

import styles from './Faq.module.css'

const FAQ_DATA = [
  {
    question: 'Meu pet pode ficar tranquilo durante o atendimento?',
    answer:
      'Sim. A ideia do Belo Cão é justamente tornar o cuidado mais tranquilo e agradável. Cada pet é observado de acordo com seu comportamento e suas necessidades durante a experiência.',
  },
  {
    question: 'Enquanto ele toma banho ou faz a tosa, posso esperar por aqui?',
    answer:
      'Pode sim. O Belo Cão tem o Pet Coffee para você ficar por perto, tomar um café, relaxar ou simplesmente acompanhar o momento enquanto seu pet recebe os cuidados.',
  },
  {
    question: 'Vocês fazem tosa na tesoura?',
    answer:
      'Sim. A tosa pode ser adaptada ao estilo, pelagem e necessidades de cada pet. O objetivo é cuidar da aparência sem deixar de lado o conforto e o bem-estar.',
  },
  {
    question: 'Vocês também trabalham comportamento animal?',
    answer:
      'Sim. O Belo Cão também oferece cuidado voltado ao comportamento animal, ajudando a tornar a rotina e determinadas experiências mais tranquilas para o pet e para quem convive com ele.',
  },
  {
    question: 'Posso conhecer a lojinha enquanto espero?',
    answer:
      'Claro. A lojinha faz parte da experiência do Belo Cão. Enquanto seu pet está sendo cuidado, você pode dar uma olhada nos produtos disponíveis por aqui.',
  },
  {
    question: 'Preciso agendar antes de ir?',
    answer:
      'Para garantir um horário e evitar espera desnecessária, recomendamos entrar em contato antes. É só chamar a gente pelo WhatsApp.',
  },
]

export function Faq() {
  return (
    <section
      id="faq"
      className={styles.faqSection}
    >
      <div className={styles.faqIntro}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowIcon}>
            <Heart
              size={13}
              fill="currentColor"
              aria-hidden="true"
            />
          </span>

          algumas coisas que você pode querer saber
        </div>

        <h2>
          Ficou com alguma
          <br />
          <em>dúvida?</em>
        </h2>

        <p>
          A gente responde. Sem complicação,
          sem letras pequenas e sem papo de pet shop.
        </p>
      </div>

      <div className={styles.faqList}>
        {FAQ_DATA.map((item, index) => (
          <details
            key={item.question}
            className={styles.faqItem}
          >
            <summary className={styles.faqQuestion}>
              <span className={styles.questionNumber}>
                {String(index + 1).padStart(2, '0')}
              </span>

              <strong>
                {item.question}
              </strong>

              <span
                className={styles.icon}
                aria-hidden="true"
              >
                <ChevronDown
                  size={20}
                  strokeWidth={2.4}
                />
              </span>
            </summary>

            <div className={styles.answerWrapper}>
              <p className={styles.faqAnswer}>
                {item.answer}
              </p>
            </div>
          </details>
        ))}
      </div>

      <div className={styles.faqFooter}>
        <div className={styles.footerIcon}>
          <Coffee
            size={19}
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>

        <div className={styles.footerText}>
          <strong>
            Ainda ficou alguma coisa no ar?
          </strong>

          <span>
            Chama a gente. É mais fácil conversar.
          </span>
        </div>

        <a
          href="#contato"
          className={styles.footerLink}
        >
          <span>falar com a gente</span>

          <ArrowUpRight
            size={17}
            strokeWidth={2.4}
            aria-hidden="true"
          />
        </a>
      </div>
    </section>
  )
}

