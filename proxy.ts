import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rafraîchit la session — NE PAS supprimer ce bloc
  const { data: { user } } = await supabase.auth.getUser()

  // Routes protégées — redirige vers /auth/login si non connecté
  const protectedPaths = ['/dashboard', '/event', '/group', '/app']
  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // / est accessible même connecté — la page d'accueil sert aussi de vitrine
  // On ajoute juste un lien "Mon dashboard" dans la nav si connecté

  return supabaseResponse
}

export const config = {
  matcher: [
    // app/sw.js et le manifeste doivent rester accessibles sans session :
    // Android les récupère avant toute connexion, et une redirection vers la
    // page de login suffit à faire échouer l'installation de l'application.
    // Les images étaient déjà exclues, d'où des icônes qui répondaient
    // correctement alors que le manifeste, lui, renvoyait une redirection.
    '/((?!_next/static|_next/image|favicon.ico|app/sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)',
  ],
}

