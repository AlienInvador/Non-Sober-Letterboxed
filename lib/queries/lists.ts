import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { Movie, MovieSummary } from '@/lib/tmdb'

async function ctx() {
  const sb = await createServerClient()
  const { data } = await sb.auth.getUser()
  if (!data.user) throw new Error('not signed in')
  return { sb, me: data.user.id }
}

type MovieRow = { tmdb_id: number; title: string; year: number | null; poster_path: string | null; backdrop_path: string | null; genres: string[] | null; runtime: number | null }
const MOVIE = 'tmdb_id, title, year, poster_path, backdrop_path, genres, runtime'
const toMovie = (m: MovieRow): Movie => ({
  tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path,
  backdropPath: m.backdrop_path, genres: m.genres ?? [], runtime: m.runtime,
})

export type ListPage = {
  id: string; title: string; description: string | null; visibility: string
  owner: { username: string } | null; crew: { id: string; name: string } | null
  canWrite: boolean
  items: { movie: MovieSummary; note: string | null }[]
}

export async function getList(id: string): Promise<ListPage | null> {
  const { sb, me } = await ctx()
  const { data: l, error } = await sb.from('lists')
    .select('id, title, description, visibility, owner_id, crew_id, profiles(username), crews(id, name)').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!l) return null
  const [items, mem] = await Promise.all([
    sb.from('list_items').select(`note, position, movies(${MOVIE})`).eq('list_id', id).order('position', { nullsFirst: false }),
    l.crew_id ? sb.from('crew_members').select('user_id').eq('crew_id', l.crew_id).eq('user_id', me).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  if (items.error) throw new Error(items.error.message)
  return {
    id: l.id, title: l.title, description: l.description, visibility: l.visibility,
    owner: (l.profiles as unknown as { username: string } | null) ?? null,
    crew: (l.crews as unknown as { id: string; name: string } | null) ?? null,
    canWrite: l.owner_id === me || !!mem.data,
    items: (items.data ?? []).flatMap((r) => {
      const m = r.movies as unknown as MovieRow | null
      return m ? [{ movie: toMovie(m), note: r.note }] : []
    }),
  }
}

export async function getQueue(): Promise<Movie[]> {
  const { sb, me } = await ctx()
  const { data, error } = await sb.from('queue').select(`movies(${MOVIE})`).eq('user_id', me).order('added_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((r) => (r.movies ? [toMovie(r.movies as unknown as MovieRow)] : []))
}

export async function isQueued(tmdbId: number): Promise<boolean> {
  const { sb, me } = await ctx()
  const { data } = await sb.from('queue').select('tmdb_id').eq('user_id', me).eq('tmdb_id', tmdbId).maybeSingle()
  return !!data
}

export async function getCrewLists(crewId: string): Promise<{ id: string; title: string; count: number }[]> {
  const { sb } = await ctx()
  const { data, error } = await sb.from('lists').select('id, title, list_items(count)').eq('crew_id', crewId).order('title')
  if (error) throw new Error(error.message)
  return (data ?? []).map((l) => ({ id: l.id, title: l.title, count: (l.list_items as unknown as { count: number }[])?.[0]?.count ?? 0 }))
}
