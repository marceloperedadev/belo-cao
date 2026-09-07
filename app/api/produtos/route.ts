import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const produtos = await sql`
      SELECT
        id,
        name,
        description,
        price,
        category,
        image_url,
        stock,
        active,
        slug
      FROM products
      WHERE active = true
      ORDER BY category ASC, name ASC
    `

    return NextResponse.json(produtos)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)

    return NextResponse.json(
      {
        error: 'Não foi possível carregar os produtos.',
      },
      {
        status: 500,
      },
    )
  }
}