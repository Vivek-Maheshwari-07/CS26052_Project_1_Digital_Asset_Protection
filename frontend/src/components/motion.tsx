import type * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

import { EASE_OUT } from '@/lib/motion'

/** Fades and lifts its children in once they scroll into view. */
export function Reveal({
  delay = 0,
  y = 16,
  children,
  ...props
}: HTMLMotionProps<'div'> & { delay?: number; y?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
