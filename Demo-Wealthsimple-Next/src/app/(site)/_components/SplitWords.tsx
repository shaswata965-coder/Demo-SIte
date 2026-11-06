import { Fragment } from 'react'

/* A headline split into words on the server, so each word can rise in on
   its own (styles/main.css, "Headline entrances"). The static page used to
   do this in the browser after load; doing it here means the words are in
   the HTML from the first byte and nothing reflows when the script starts.
   Screen readers get the sentence once, whole. With `crop`, each word sits
   in a mask and rises out of it. Without `srText` (inside an element that is
   already aria-hidden) only the visual words are written. */
export function SplitWords({ text, crop = false, srText = true }: { text: string; crop?: boolean; srText?: boolean }) {
  const clean = text.replace(/\s+/g, ' ').trim()
  const words = clean.split(' ').map((w, i) => {
    const word = (
      <span className="at-w" data-s="prep">
        {w}
      </span>
    )
    return (
      <Fragment key={i}>
        {i > 0 && ' '}
        {crop ? <span className="at-m">{word}</span> : word}
      </Fragment>
    )
  })
  if (!srText) return <span>{words}</span>
  return (
    <>
      <span className="sr-only">{clean}</span>
      <span aria-hidden="true">{words}</span>
    </>
  )
}
