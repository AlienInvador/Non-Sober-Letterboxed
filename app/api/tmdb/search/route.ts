import { NextResponse } from 'next/server'
import { searchMovies, TmdbError } from '@/lib/tmdb'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  // middleware lets /api/tmdb through so clients get JSON, not a login redirect; auth is enforced here
  const { data } = await (await createServerClient()).auth.getUser()
  if (!data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 100)
  try {
    return NextResponse.json(await searchMovies(q))
  } catch (e) {
    if (e instanceof TmdbError) return NextResponse.json({ error: 'tmdb_unavailable' }, { status: 502 })
    throw e
  }
}
