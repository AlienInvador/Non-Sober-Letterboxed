'use client'
import { useActionState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { verifyAge } from './actions'

export default function Gate() {
  const [state, action, pending] = useActionState(verifyAge, null)
  const reduce = useReducedMotion()
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">come on in, pull up a cushion</p>
      <motion.h1
        className="font-display text-5xl"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      >
        geeked-drunk
      </motion.h1>
      <p className="text-body">
        Rate movies by how you watched them: drunk, high, or both. Alcohol and weed are 21 and over, so tell us when you were born.
      </p>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-muted">
          Date of birth
          <input type="date" name="dob" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-60">
          Enter
        </button>
        {state?.reason === 'under21' && (
          <p role="alert" className="text-drunk">Come back when you’re 21</p>
        )}
      </form>
      <p className="text-sm text-faint">
        By entering you confirm you are of legal age where you live. Know your limits and look out for each other.
      </p>
    </main>
  )
}
