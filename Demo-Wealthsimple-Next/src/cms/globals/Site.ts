import type { GlobalConfig } from 'payload'

import { signedIn } from '../access'
import { revalidateHome } from '../revalidate'
import { safeHref } from '../validate'

/* What every page shares: search snippet, header button, contact details,
   footer, and the strip linking the repo's other demos. */
export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Site settings',
  admin: { group: 'Settings' },
  access: { read: signedIn, update: signedIn },
  versions: { max: 25 },
  hooks: { afterChange: [({ context }) => revalidateHome(context)] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'seo',
          label: 'Search',
          fields: [
            { name: 'title', type: 'text', required: true, maxLength: 70 },
            { name: 'description', type: 'textarea', required: true, maxLength: 200 },
          ],
        },
        {
          label: 'Header and contact',
          fields: [
            { name: 'headerCta', label: 'Header button', type: 'text', required: true, maxLength: 24 },
            { name: 'menuCta', label: 'Phone menu button', type: 'text', required: true, maxLength: 32 },
            {
              name: 'contact',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'email', type: 'email', required: true },
                    { name: 'phone', type: 'text', required: true },
                  ],
                },
                { name: 'offices', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          name: 'footer',
          label: 'Footer',
          fields: [
            { name: 'legal', type: 'textarea', required: true },
            { name: 'copyright', type: 'text', required: true },
          ],
        },
        {
          label: 'Demo strip',
          fields: [
            {
              name: 'demoLinks',
              label: 'Other demos',
              type: 'array',
              maxRows: 4,
              admin: { description: 'The dark strip pinned above the header. Leave empty to hide it.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'reference', type: 'text', admin: { description: 'Shown after a dot on wide screens.' } },
                    { name: 'href', label: 'Link', type: 'text', required: true, validate: safeHref },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
