import { createClient } from '@supabase/supabase-js'
import { ALICE, BOB, CAROL } from './helpers'

// Removes what the e2e users created (seshes, recs, lists, crews). Keeps the users and their friendship (setup re-creates it anyway).
// Every delete is scoped to the e2e user ids; an empty id list throws instead of deleting broadly.
export default async function globalTeardown() {
  process.loadEnvFile('.env.local')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  const { data, error } = await admin.from('profiles').select('id').in('username', [ALICE.username, BOB.username, CAROL.username])
  if (error) throw new Error(`e2e teardown: ${error.message}`)
  const ids = (data ?? []).map((p) => p.id)
  if (ids.length === 0) throw new Error('e2e teardown: no e2e user ids found; refusing to delete')

  const steps = [
    admin.from('recommendations').delete().in('from_user', ids),
    admin.from('sessions').delete().in('user_id', ids),
    admin.from('lists').delete().in('owner_id', ids),
    admin.from('crews').delete().in('created_by', ids), // crew members and crew lists cascade
  ]
  for (const step of steps) {
    const r = await step
    if (r.error) throw new Error(`e2e teardown: ${r.error.message}`)
  }
}
