import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const store = await cookies()
      const next = safeNext(store.get('next')?.value)
      store.delete('next')
      return NextResponse.redirect(`${origin}${next ?? '/'}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/login`)
}
