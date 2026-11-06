/* Links an editor can enter: an anchor on the page (#contact), a path on
   this site (/about) or an https URL. Anything else, javascript: and data:
   included, is refused before it can reach the page. */
export function safeHref(value: unknown): true | string {
  if (typeof value !== 'string' || value === '') return 'Enter a link.'
  if (/^#[A-Za-z][\w-]*$/.test(value)) return true
  if (/^\/(?!\/)[\w\-./~%?=&#]*$/.test(value)) return true
  try {
    const u = new URL(value)
    if (u.protocol === 'https:' || u.protocol === 'mailto:') return true
  } catch {
    /* not a URL */
  }
  return 'Use #section, /path, https://… or mailto:…'
}

export function safeSlug(value: unknown): true | string {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(value)
    ? true
    : 'Lowercase letters, digits and hyphens, starting with a letter.'
}
