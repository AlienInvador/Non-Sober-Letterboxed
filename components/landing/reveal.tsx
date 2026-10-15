'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

// Visible on the server and without JS; only sections below the fold are hidden after mount, then revealed on scroll.
export function Reveal({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref, { once: true, margin: '-5% 0px' })
  const [belowFold, setBelowFold] = useState(false)
  useEffect(() => {
    if (!reduce && ref.current && ref.current.getBoundingClientRect().top > window.innerHeight) setBelowFold(true)
  }, [reduce])
  const hidden = belowFold && !seen
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial={false}
      animate={hidden ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.section>
  )
}
