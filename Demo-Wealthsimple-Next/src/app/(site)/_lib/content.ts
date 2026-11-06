import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Product } from '@/payload-types'

/* Everything the home page shows, read on the server through Payload's
   Local API (no HTTP, no public API access needed). The page is rendered
   once and cached; saving in the admin rebuilds it (src/cms/revalidate.ts). */
export const getContent = cache(async () => {
  const payload = await getPayload({ config })
  const [home, site, all] = await Promise.all([
    payload.findGlobal({ slug: 'home', depth: 1 }),
    payload.findGlobal({ slug: 'site', depth: 0 }),
    payload.find({ collection: 'products', sort: 'menuOrder', limit: 100, depth: 0, pagination: false }),
  ])

  const placed = (list: (number | Product)[] | null | undefined) =>
    (list ?? []).filter((p): p is Product => typeof p === 'object' && p !== null)
  const before = placed(home.productsBeforeAbout)
  const after = placed(home.productsAfterAbout)

  /* The menus list only products that have a section on the page, so no
     link points at a missing anchor. */
  const onPage = new Set([...before, ...after].map((p) => p.id))
  const menu = all.docs.filter((p) => onPage.has(p.id))

  return { home, site, before, after, menu }
})
