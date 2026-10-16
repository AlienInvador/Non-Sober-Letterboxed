import { z } from 'zod'

export const sessionInput = z
  .object({
    tmdbId: z.number().int().positive(),
    influence: z.enum(['drunk', 'high', 'both', 'sober']),
    recommend: z.boolean().nullable().default(null),
    review: z.string().max(2000, 'Keep the review under 2000 characters.').nullable().default(null),
    visibility: z.enum(['private', 'crew', 'friends', 'public']).default('friends'),
    crewId: z.uuid().nullable().default(null),
    companionIds: z.array(z.uuid()).max(20).default([]),
    rewatch: z.boolean().default(false),
    watchedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((s) => (s.influence === 'sober') === (s.recommend === null), {
    path: ['recommend'],
    message: 'recommend is required unless sober, and not allowed when sober',
  })
  .refine((s) => (s.visibility === 'crew') === (s.crewId !== null), {
    path: ['crewId'],
    message: 'crewId is required iff visibility is crew',
  })

export type SessionInput = z.infer<typeof sessionInput>
