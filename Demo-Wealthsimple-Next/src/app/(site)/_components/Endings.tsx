'use client'

import { useEffect, useRef, useState } from 'react'

/* The last line of the closing headline turns over like a drum. It holds
   still for reduced motion, while paused, in a background tab, and while
   its section is off screen (_lib/site.js marks it data-offscreen). */
export function Endings({ words }: { words: string[] }) {
  const box = useRef<HTMLSpanElement>(null)
  const [turn, setTurn] = useState({ k: 0, n: 0, out: false })

  useEffect(() => {
    if (words.length < 2) return
    const root = document.documentElement
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    const id = setInterval(() => {
      const section = box.current?.closest('section')
      if (
        still.matches ||
        root.getAttribute('data-motion') === 'paused' ||
        document.hidden ||
        section?.hasAttribute('data-offscreen')
      )
        return
      setTurn((t) => ({ k: (t.k + 1) % words.length, n: t.n + 1, out: true }))
    }, 2600)
    return () => clearInterval(id)
  }, [words.length])

  /* The outgoing word leaves after its quarter-second turn. */
  useEffect(() => {
    if (!turn.out) return
    const t = setTimeout(() => setTurn((s) => ({ ...s, out: false })), 260)
    return () => clearTimeout(t)
  }, [turn.n, turn.out])

  const prev = (turn.k - 1 + words.length) % words.length
  return (
    <span className="ending" aria-hidden="true" ref={box}>
      {turn.out && (
        <span key={turn.n - 1} className="ending-word out">
          {words[prev]}
        </span>
      )}
      <span key={turn.n} className={turn.n ? 'ending-word in' : 'ending-word'}>
        {words[turn.k]}
      </span>
    </span>
  )
}
