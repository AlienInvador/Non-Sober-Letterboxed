'use client'
import { motion, useReducedMotion } from 'motion/react'

export function Reveal({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.section>
  )
}
