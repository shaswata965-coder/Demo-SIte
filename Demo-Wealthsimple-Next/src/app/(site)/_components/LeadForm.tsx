'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* The opener's form. A demo: nothing is sent, and the page says so. */
export function LeadForm(props: { placeholder: string; button: string; thanks: string; invalid: string }) {
  const input = useRef<HTMLInputElement>(null)
  const msg = useRef<HTMLParagraphElement>(null)
  const [state, setState] = useState<{ ok: boolean; n: number } | null>(null)

  function submit(ev: FormEvent) {
    ev.preventDefault()
    const ok = EMAIL.test((input.current?.value ?? '').trim())
    setState((s) => ({ ok, n: (s?.n ?? 0) + 1 }))
    if (!ok) input.current?.focus()
  }

  /* The message slides in again on every submit. The same live region is
     kept so screen readers announce each change. */
  useEffect(() => {
    const el = msg.current
    if (!el || !state) return
    el.classList.remove('shown')
    void el.offsetWidth
    el.classList.add('shown')
  }, [state])

  return (
    <form className="lead" id="leadForm" noValidate data-at-fade="" onSubmit={submit}>
      <label className="sr-only" htmlFor="leadEmail">
        {props.placeholder}
      </label>
      <input
        ref={input}
        id="leadEmail"
        name="email"
        type="email"
        placeholder={props.placeholder}
        autoComplete="email"
        required
        aria-invalid={state ? !state.ok : undefined}
      />
      <button className="btn btn-solid" type="submit">
        {props.button}
      </button>
      <p className="lead-msg" id="leadMsg" role="status" hidden={!state} ref={msg}>
        {state ? (state.ok ? props.thanks : props.invalid) : null}
      </p>
    </form>
  )
}
