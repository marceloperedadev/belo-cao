import { NextRequest, NextResponse } from 'next/server'

import { sql } from '@/lib/db'
import { exigirAdmin } from '@/lib/auth'

/* =========================================================
   TIPOS
   ========================================================= */

type ProdutoBody = {
  id?: string | number | null
  name?: string | null
  description?: string | null
  price?: number | string | null
  category?: string | null
  image_url?: string | null
  stock?: number | string | null
  active?: boolean | string | number | null
}

/* =========================================================
   HELPERS
   ========================================================= */

function idSeguro(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const id = String(value).trim()

  if (!id) {
    return null
  }

  return id
}

function textoSeguro(
  value: unknown,
  fallback = '',
): string {
  if (value === null || value === undefined) {
    return fallback
  }

  const texto = String(value).trim()

  return texto || fallback
}

function numeroSeguro(
  value: unknown,
  fallback = 0,
): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === 'string') {
    const texto = value.trim()

    if (!texto) {
      return fallback
    }

    const normalizado = texto
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')

    const numero = Number(normalizado)

    return Number.isFinite(numero) ? numero : fallback
  }

  return fallback
}

function inteiroSeguro(
  value: unknown,
  fallback = 0,
): number {
  const numero = numeroSeguro(value, fallback)

  return Number.isInteger(numero)
    ? numero
    : Math.floor(numero)
}

function booleanoSeguro(
  value: unknown,
  fallback = true,
): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const texto = value.trim().toLowerCase()

    if (
      texto === 'false' ||
      texto === '0' ||
      texto === 'off' ||
      texto === 'no'
    ) {
      return false
    }

    if (
      texto === 'true' ||
      texto === '1' ||
      texto === 'on' ||
      texto === 'yes'
    ) {
      return true
    }
  }

  return fallback
}

function imagemSegura(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const texto = String(value).trim()

  if (!texto) {
    return null
  }

  try {
    const url = new URL(texto)

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
  try {
    await exigirAdmin()

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
        created_at,
        updated_at
      FROM public.products
      ORDER BY created_at DESC
    `

    return NextResponse.json(produtos)
  } catch (error) {
    console.error(
      'GET /api/admin/produtos:',
      error,
    )

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

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    await exigirAdmin()

    const body =
      (await request.json()) as ProdutoBody

    const name = textoSeguro(body.name)
    const description = textoSeguro(
      body.description,
    )
    const category = textoSeguro(
      body.category,
      'Geral',
    )
    const price = numeroSeguro(body.price)
    const stock = inteiroSeguro(body.stock)
    const active = booleanoSeguro(
      body.active,
      true,
    )

    let imageUrl: string | null = null

    if (
      body.image_url !== undefined &&
      body.image_url !== null &&
      String(body.image_url).trim()
    ) {
      imageUrl = imagemSegura(
        body.image_url,
      )

      if (!imageUrl) {
        return NextResponse.json(
          {
            error:
              'A URL da imagem é inválida.',
          },
          {
            status: 400,
          },
        )
      }
    }

    /* -----------------------------------------------------
       VALIDAÇÕES
       ----------------------------------------------------- */

    if (!name) {
      return NextResponse.json(
        {
          error:
            'Informe o nome do produto.',
        },
        {
          status: 400,
        },
      )
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error:
            'Informe um preço válido.',
        },
        {
          status: 400,
        },
      )
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json(
        {
          error:
            'Informe um estoque válido.',
        },
        {
          status: 400,
        },
      )
    }

    /* -----------------------------------------------------
       DUPLICIDADE DE NOME
       ----------------------------------------------------- */

    const existente = await sql`
      SELECT id
      FROM public.products
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
      LIMIT 1
    `

    if (existente.length > 0) {
      return NextResponse.json(
        {
          error:
            'Já existe um produto com esse nome.',
        },
        {
          status: 409,
        },
      )
    }

    /* -----------------------------------------------------
       INSERT
       ----------------------------------------------------- */

    const resultado = await sql`
      INSERT INTO public.products (
        name,
        description,
        price,
        category,
        image_url,
        stock,
        active
      )
      VALUES (
        ${name},
        ${description || null},
        ${price},
        ${category},
        ${imageUrl},
        ${stock},
        ${active}
      )
      RETURNING
        id,
        name,
        description,
        price,
        category,
        image_url,
        stock,
        active,
        created_at,
        updated_at
    `

    return NextResponse.json(
      resultado[0],
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      'POST /api/admin/produtos:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Não foi possível criar o produto.',
      },
      {
        status: 500,
      },
    )
  }
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request: NextRequest,
) {
  try {
    await exigirAdmin()

    const body =
      (await request.json()) as ProdutoBody

    const id = idSeguro(body.id)

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Produto inválido.',
        },
        {
          status: 400,
        },
      )
    }

    const name = textoSeguro(body.name)

    if (!name) {
      return NextResponse.json(
        {
          error:
            'Informe o nome do produto.',
        },
        {
          status: 400,
        },
      )
    }

    const price = numeroSeguro(body.price)

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error:
            'Informe um preço válido.',
        },
        {
          status: 400,
        },
      )
    }

    const active = booleanoSeguro(
      body.active,
      true,
    )

    const category = textoSeguro(
      body.category,
      'Geral',
    )

    let imageUrl: string | null = null

    if (
      body.image_url !== undefined &&
      body.image_url !== null &&
      String(body.image_url).trim()
    ) {
      imageUrl = imagemSegura(
        body.image_url,
      )

      if (!imageUrl) {
        return NextResponse.json(
          {
            error:
              'A URL da imagem é inválida.',
          },
          {
            status: 400,
          },
        )
      }
    }

    const description = textoSeguro(
      body.description,
    )

    /* -----------------------------------------------------
       VERIFICA PRODUTO
       ----------------------------------------------------- */

    const produtoExiste = await sql`
      SELECT id
      FROM public.products
      WHERE id = ${id}
      LIMIT 1
    `

    if (produtoExiste.length === 0) {
      return NextResponse.json(
        {
          error:
            'Produto não encontrado.',
        },
        {
          status: 404,
        },
      )
    }

    /* -----------------------------------------------------
       VERIFICA NOME DUPLICADO
       ----------------------------------------------------- */

    const nomeDuplicado = await sql`
      SELECT id
      FROM public.products
      WHERE
        LOWER(TRIM(name)) = LOWER(TRIM(${name}))
        AND id <> ${id}
      LIMIT 1
    `

    if (nomeDuplicado.length > 0) {
      return NextResponse.json(
        {
          error:
            'Já existe outro produto com esse nome.',
        },
        {
          status: 409,
        },
      )
    }

    /* -----------------------------------------------------
       UPDATE
       ----------------------------------------------------- */

    const resultado = await sql`
      UPDATE public.products
      SET
        name = ${name},
        description = ${description || null},
        price = ${price},
        category = ${category},
        image_url = ${imageUrl},
        active = ${active},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        name,
        description,
        price,
        category,
        image_url,
        stock,
        active,
        created_at,
        updated_at
    `

    if (resultado.length === 0) {
      return NextResponse.json(
        {
          error:
            'Não foi possível atualizar o produto.',
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      resultado[0],
    )
  } catch (error) {
    console.error(
      'PATCH /api/admin/produtos:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Não foi possível atualizar o produto.',
      },
      {
        status: 500,
      },
    )
  }
}