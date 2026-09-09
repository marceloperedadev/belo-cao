import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

// =========================================================
// BELO CÃO
// URL DO SITE
// =========================================================
//
// Em produção:
//
// NEXT_PUBLIC_SITE_URL=https://seu-endereco-do-belo-cao.vercel.app
//
// Enquanto a variável não existir, usamos localhost.
//

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000'

// =========================================================
// METADATA
// =========================================================

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default:
      'Belo Cão | Estética Animal, Pet Coffee e Lojinha',

    template:
      '%s | Belo Cão',
  },

  description:
    'Belo Cão — estética animal, pet coffee e lojinha em Taubaté. Um espaço pensado para cuidar dos pets com carinho e transformar cada visita em uma experiência especial.',

  keywords: [
    'Belo Cão',
    'Belo Cão Taubaté',
    'Belo Cão Estética Animal',
    'estética animal Taubaté',
    'pet shop Taubaté',
    'banho e tosa Taubaté',
    'banho e tosa',
    'estética animal',
    'pet coffee Taubaté',
    'pet coffee',
    'lojinha pet',
    'loja pet Taubaté',
    'cuidados para pets',
    'pet shop',
  ],

  authors: [
    {
      name: 'Belo Cão',
    },
  ],

  creator: 'Belo Cão',

  publisher: 'Belo Cão',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: '/',
  },

  // =======================================================
  // OPEN GRAPH
  // =======================================================

  openGraph: {
    title:
      'Belo Cão | Estética Animal, Pet Coffee e Lojinha',

    description:
      'Estética animal, pet coffee e lojinha em Taubaté. Um espaço pensado para cuidar dos pets com carinho.',

    url: SITE_URL,

    siteName: 'Belo Cão',

    locale: 'pt_BR',

    type: 'website',
  },

  // =======================================================
  // TWITTER / X
  // =======================================================

  twitter: {
    card: 'summary',

    title:
      'Belo Cão | Estética Animal, Pet Coffee e Lojinha',

    description:
      'Estética animal, pet coffee e lojinha em Taubaté.',
  },

  // =======================================================
  // ROBOTS
  // =======================================================

  robots: {
    index: true,

    follow: true,

    googleBot: {
      index: true,

      follow: true,

      'max-video-preview': -1,

      'max-image-preview': 'large',

      'max-snippet': -1,
    },
  },
}

// =========================================================
// ROOT LAYOUT
// =========================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // =======================================================
  // SCHEMA.ORG — BELO CÃO
  // =======================================================

  const jsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'LocalBusiness',

    '@id':
      `${SITE_URL}/#belo-cao`,

    name:
      'Belo Cão',

    alternateName:
      'Belo Cão Estética Animal',

    description:
      'Estética animal, pet coffee e lojinha para pets.',

    url:
      SITE_URL,

    sameAs: [
      'https://www.instagram.com/belocaoestetica_animal/',
    ],

    address: {
      '@type':
        'PostalAddress',

      addressLocality:
        'Taubaté',

      addressRegion:
        'SP',

      addressCountry:
        'BR',
    },

    areaServed: {
      '@type':
        'City',

      name:
        'Taubaté',

      containedInPlace: {
        '@type':
          'State',

        name:
          'São Paulo',
      },
    },

    priceRange:
      '$$',
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              JSON.stringify(
                jsonLd,
              ),
          }}
        />
      </head>

      <body
        className={
          inter.className
        }
      >
        {children}
      </body>
    </html>
  )
}