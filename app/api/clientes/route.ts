import { NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'

export const runtime = 'nodejs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

function normalizarWhatsapp(valor: string) {
  const numeros = valor.replace(/\D/g, '')

  if (numeros.startsWith('55')) {
    return numeros
  }

  if (numeros.length === 10 || numeros.length === 11) {
    return `55${numeros}`
  }

  return numeros
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const whatsappInformado =
      searchParams.get('whatsapp') || ''

    const whatsapp =
      normalizarWhatsapp(whatsappInformado)

    if (
      whatsapp.length !== 12 &&
      whatsapp.length !== 13
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'WhatsApp inválido.',
        },
        { status: 400 },
      )
    }

    const resultado = await pool.query(
      `
        SELECT
          id,
          name,
          whatsapp,
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          reference_point,
          created_at,
          updated_at
        FROM public.customers
        WHERE whatsapp = $1
        LIMIT 1
      `,
      [whatsapp],
    )

    if (resultado.rows.length === 0) {
      return NextResponse.json(
        {
          sucesso: true,
          encontrado: false,
          cliente: null,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        sucesso: true,
        encontrado: true,
        cliente: resultado.rows[0],
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(
      'Erro ao buscar cliente:',
      error,
    )

    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Não foi possível consultar o cliente.',
      },
      { status: 500 },
    )
  }
}