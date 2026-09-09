import { NextRequest, NextResponse } from 'next/server'

/* =========================================================
   BELO CÃO
   MIDDLEWARE ADMINISTRATIVO
   ========================================================= */

const COOKIE_NAME = 'belocao_admin_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessao = request.cookies.get(
    COOKIE_NAME,
  )?.value

  /* =======================================================
     LOGIN
     ======================================================= */

  if (pathname === '/admin/login') {
    /*
     * Se já existe sessão, não faz sentido mostrar
     * novamente a tela de login.
     *
     * A validação real da sessão acontece no servidor.
     * Aqui fazemos apenas o redirecionamento inicial.
     */

    if (sessao) {
      return NextResponse.redirect(
        new URL('/admin/pedidos', request.url),
      )
    }

    return NextResponse.next()
  }

  /* =======================================================
     ÁREA ADMINISTRATIVA
     ======================================================= */

  if (pathname.startsWith('/admin')) {
    if (!sessao) {
      const loginUrl = new URL(
        '/admin/login',
        request.url,
      )

      loginUrl.searchParams.set(
        'redirect',
        pathname,
      )

      return NextResponse.redirect(loginUrl)
    }
  }

  /* =======================================================
     API ADMINISTRATIVA
     ======================================================= */

  if (pathname.startsWith('/api/admin')) {
    if (!sessao) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não autorizado.',
        },
        {
          status: 401,
        },
      )
    }
  }

  return NextResponse.next()
}

/* =========================================================
   ROTAS PROTEGIDAS
   ========================================================= */

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}