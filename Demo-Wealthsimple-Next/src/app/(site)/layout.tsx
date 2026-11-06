import type { Metadata, Viewport } from 'next'
import { Jost, Newsreader } from 'next/font/google'
import type { ReactNode } from 'react'

import { getContent } from './_lib/content'
import './styles/tokens.css'
import './styles/main.css'
import './styles/assets.css'
import './styles/intro.css'
import './styles/banner.css'

/* The reference's type pairing, self-hosted: downloaded once at build time
   and served from this origin, so a visitor never contacts Google. */
const jost = Jost({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-jost', display: 'swap' })
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
  display: 'swap',
})

/* Before first paint: the saved theme, motion and demos-strip choices,
   whether headings may wait for their entrance, and whether the opening
   plays. Without it every heading is simply shown and there is no opening.
   A fixed string written here, never content from the CMS. */
const EARLY = `(function (d) {
  try { var t = localStorage.getItem('larch-theme'); if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t); } catch (e) {}
  try { if (localStorage.getItem('larch-motion') === 'paused') d.setAttribute('data-motion', 'paused'); } catch (e) {}
  try { if (localStorage.getItem('larch-banner') === 'hidden') d.classList.add('no-banner'); } catch (e) {}
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still && 'IntersectionObserver' in window) d.classList.add('at-on');
  if (!still && d.getAttribute('data-motion') !== 'paused') d.classList.add('intro-on');
})(document.documentElement);`

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getContent()
  return { title: site.seo.title, description: site.seo.description }
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { site } = await getContent()
  const noBanner = site.demoLinks?.length ? '' : ' no-banner'
  return (
    /* The early script adds classes and attributes to <html> before React
       hydrates, so its attributes are expected to differ. */
    <html lang="en" className={`${jost.variable} ${newsreader.variable}${noBanner}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
