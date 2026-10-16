import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-next'

const PUBLIC = ['/gate', '/auth', '/welcome']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl
  const go = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url))
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
    // remember where the visitor was headed (invite links) across gate, login and onboarding
    const target = pathname + request.nextUrl.search
    if (safeNext(target) && pathname !== '/' && !pathname.startsWith('/api') && !PUBLIC.some((p) => pathname.startsWith(p)) && pathname !== '/onboarding') {
      res.cookies.set('next', target, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' })
    }
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  // refresh session
  let user = null
  try {
    user = (await supabase.auth.getUser()).data.user
  } catch {}

  if (!request.cookies.get('age_ok') && pathname !== '/gate') return go('/gate')
  // /api/tmdb stays behind age_ok but skips the login redirect
  if (pathname.startsWith('/api/tmdb') || PUBLIC.some((p) => pathname.startsWith(p))) return response
  if (!user && pathname === '/') {
    // signed-out home is the landing page; URL stays /
    const res = NextResponse.rewrite(new URL('/welcome', request.url))
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }
  if (!user) return go('/auth/login')
  if (pathname !== '/onboarding') {
    const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (error || !data) return go('/onboarding')
  }
  return response
}
