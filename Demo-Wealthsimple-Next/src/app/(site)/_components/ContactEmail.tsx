'use client'

import { useEffect, useRef, useState } from 'react'

/* The close's email address with its copy button. Where the clipboard is
   not available, the address is selected instead. */
export function ContactEmail({ email }: { email: string }) {
  const text = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [label, setLabel] = useState<'Copy' | 'Copied' | 'Selected'>('Copy')
  const [n, setN] = useState(0)

  function select() {
    if (!text.current) return
    const r = document.createRange()
    r.selectNodeContents(text.current)
    const s = window.getSelection()
    s?.removeAllRanges()
    s?.addRange(r)
  }
  function done(l: 'Copied' | 'Selected') {
    setLabel(l)
    setN((k) => k + 1)
  }
  function copy() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(
        () => done('Copied'),
        () => {
          select()
          done('Selected')
        },
      )
    } else {
      select()
      done('Selected')
    }
  }

  useEffect(() => {
    if (!n || !btn.current) return
    const b = btn.current
    b.classList.remove('pop')
    void b.offsetWidth
    b.classList.add('pop')
    const t = setTimeout(() => {
      setLabel('Copy')
      b.classList.remove('pop')
    }, 2000)
    return () => clearTimeout(t)
  }, [n])

  return (
    <p>
      <span className="contact-k">Email</span>{' '}
      <span className="contact-v" id="email" ref={text}>
        {email}
      </span>{' '}
      <button className="copy" id="copyEmail" type="button" onClick={copy} ref={btn}>
        {label}
      </button>
    </p>
  )
}
