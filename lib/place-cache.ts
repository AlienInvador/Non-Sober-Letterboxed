import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { nameKey, type PlaceCategory } from '@/lib/places'

type PlaceIn = { name: string; category: PlaceCategory | null }

export type PlaceDb = {
  insertIfNew(p: PlaceIn): Promise<void>
  idByKey(key: string): Promise<string | null>
}

function adminDb(): PlaceDb {
  const admin = createAdminClient()
  return {
    async insertIfNew(p) {
      // name_key is generated; the first spelling wins
      const { error } = await admin.from('places')
        .upsert({ name: p.name.trim(), category: p.category }, { onConflict: 'name_key', ignoreDuplicates: true })
      if (error) throw new Error(error.message)
    },
    async idByKey(key) {
      const { data, error } = await admin.from('places').select('id').eq('name_key', key).maybeSingle()
      if (error) throw new Error(error.message)
      return data?.id ?? null
    },
  }
}

export async function ensurePlaceCached(p: PlaceIn, deps: { db?: PlaceDb } = {}): Promise<string> {
  const { db = adminDb() } = deps
  await db.insertIfNew(p)
  const id = await db.idByKey(nameKey(p.name))
  if (!id) throw new Error('place not found after upsert')
  return id
}
