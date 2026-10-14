import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC = ['/gate', '/auth']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl
  const go = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url))
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
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
  if (!user) return go('/auth/login')
  if (pathname !== '/onboarding') {
    const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (error || !data) return go('/onboarding')
  }
  return response
}
