import type { CSSProperties } from 'react'

/* Custom properties (--i, --k, …) on an element, which React's style type
   does not know about. */
export const v = (props: Record<`--${string}`, string | number>) => props as CSSProperties
