import { sql } from '@/lib/db'

export default async function TesteBanco() {
  const products = await sql`
    SELECT
      id,
      name,
      price,
      category,
      image_url,
      stock,
      active
    FROM products
    ORDER BY created_at DESC
  `

  return (
    <main
      style={{
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>Teste do Banco — Belo Cão</h1>

      <p>
        Produtos encontrados: {products.length}
      </p>

      {products.map((product) => (
        <div
          key={product.id}
          style={{
            marginTop: '20px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '12px',
          }}
        >
          <h2>{product.name}</h2>

          <p>
            Preço: R$ {Number(product.price).toFixed(2).replace('.', ',')}
          </p>

          <p>Categoria: {product.category}</p>

          <p>Estoque: {product.stock}</p>

          <p>
            Status:{' '}
            {product.active ? 'Ativo' : 'Inativo'}
          </p>

          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                width: '250px',
                height: '250px',
                objectFit: 'cover',
                borderRadius: '12px',
                marginTop: '10px',
              }}
            />
          )}
        </div>
      ))}
    </main>
  )
}