'use client'
import { useEffect } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'

// 200ms opacity fade + 8px rise on every navigation. Runs after mount so the SSR HTML is fully visible without JS.
export default function Template({ children }: { children: React.ReactNode }) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!reduce) animate(scope.current, { opacity: [0, 1], y: [8, 0] }, { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] })
  }, [animate, scope, reduce])
  return <div ref={scope} data-testid="page-transition">{children}</div>
}
