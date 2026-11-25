import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

// Also the landing spot after password login/sign-up (no code, session already set), so the `next` cookie is honored.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const supabase = await createServerClient()
  const ok = code ? !(await supabase.auth.exchangeCodeForSession(code)).error : !!(await supabase.auth.getUser()).data.user
  if (ok) {
    const store = await cookies()
    const next = safeNext(searchParams.get('next')) ?? safeNext(store.get('next')?.value)
    store.delete('next')
    return NextResponse.redirect(`${origin}${next ?? '/'}`)
  }
  return NextResponse.redirect(`${origin}/auth/login?error=link`)
}
