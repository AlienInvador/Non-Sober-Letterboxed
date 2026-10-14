import { NextResponse } from 'next/server'
import { searchMovies, TmdbError } from '@/lib/tmdb'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  try {
    return NextResponse.json(await searchMovies(q))
  } catch (e) {
    if (e instanceof TmdbError) return NextResponse.json({ error: 'tmdb_unavailable' }, { status: 502 })
    throw e
  }
}
