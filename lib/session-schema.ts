import { z } from 'zod'

export const sessionInput = z
  .object({
    tmdbId: z.number().int().positive(),
    influence: z.enum(['drunk', 'high', 'both', 'sober']),
    rating: z.number().min(0.5).max(5).refine((n) => n * 2 === Math.round(n * 2)).nullable().default(null),
    recommend: z.boolean().nullable().default(null),
    review: z.string().nullable().default(null),
    visibility: z.enum(['private', 'crew', 'friends', 'public']).default('friends'),
    crewId: z.string().nullable().default(null),
    companionIds: z.array(z.string()).default([]),
    rewatch: z.boolean().default(false),
    watchedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((s) => !(s.influence === 'sober' && s.recommend !== null), {
    path: ['recommend'],
    message: 'sober sessions cannot have a recommendation',
  })
  .refine((s) => (s.visibility === 'crew') === (s.crewId !== null), {
    path: ['crewId'],
    message: 'crewId is required iff visibility is crew',
  })

export type SessionInput = z.infer<typeof sessionInput>
