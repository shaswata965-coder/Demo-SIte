import type { GlobalConfig } from 'payload'

import { signedIn } from '../access'
import { revalidateHome } from '../revalidate'
import { safeHref } from '../validate'

/* The home page, section by section, in the order a visitor meets them. */
export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Home page',
  access: { read: signedIn, update: signedIn },
  versions: { max: 25 },
  hooks: { afterChange: [({ context }) => revalidateHome(context)] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'hero',
          label: 'Opener',
          description: 'The first screen, over the growing decision tree.',
          fields: [
            { name: 'eyebrow', type: 'text', required: true, maxLength: 48 },
            {
              name: 'headline',
              type: 'textarea',
              required: true,
              maxLength: 90,
              admin: { description: 'Beyond about 90 characters it wraps past four lines on a phone.' },
            },
            {
              type: 'row',
              fields: [
                { name: 'emailPlaceholder', label: 'Email field hint', type: 'text', required: true },
                { name: 'buttonLabel', label: 'Button', type: 'text', required: true, maxLength: 24 },
              ],
            },
            { name: 'finePrint', type: 'textarea', required: true, maxLength: 220 },
            {
              name: 'thanksMessage',
              label: 'After a valid email',
              type: 'textarea',
              required: true,
              admin: { description: 'The form is a demo: nothing is sent, and this message should say so.' },
            },
            { name: 'invalidMessage', label: 'After an invalid email', type: 'text', required: true },
          ],
        },
        {
          label: 'Layout',
          description: 'Which product sections sit above the "Why Larch" statement and which below it, in order. Drag to reorder.',
          fields: [
            {
              name: 'productsBeforeAbout',
              label: 'Before "Why Larch"',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
            },
            {
              name: 'productsAfterAbout',
              label: 'After "Why Larch"',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
            },
          ],
        },
        {
          name: 'about',
          label: 'Why Larch',
          fields: [
            { name: 'heading', type: 'text', required: true, maxLength: 48 },
            {
              name: 'thesis',
              type: 'textarea',
              required: true,
              maxLength: 600,
              admin: { description: 'Lights up word by word as a visitor reads down it.' },
            },
            { name: 'finePrint', type: 'textarea', required: true },
          ],
        },
        {
          name: 'newsletter',
          label: 'Newsletter',
          fields: [
            { name: 'name', type: 'text', required: true, maxLength: 24 },
            { name: 'description', type: 'textarea', required: true, maxLength: 200 },
            {
              type: 'row',
              fields: [
                { name: 'ctaLabel', label: 'Button', type: 'text', required: true, maxLength: 32 },
                { name: 'ctaHref', label: 'Link', type: 'text', required: true, validate: safeHref },
              ],
            },
            { name: 'note', type: 'text', required: true },
          ],
        },
        {
          name: 'close',
          label: 'Close',
          description: 'The full-height close, over the loss surface.',
          fields: [
            {
              name: 'lead',
              type: 'text',
              required: true,
              maxLength: 48,
              admin: { description: 'The fixed part of the headline: "Every decision, explained to your".' },
            },
            {
              name: 'endings',
              type: 'array',
              minRows: 1,
              maxRows: 8,
              admin: { description: 'The last word turns over like a drum, through these in order.' },
              fields: [{ name: 'word', type: 'text', required: true, maxLength: 16 }],
            },
            { name: 'sub', type: 'text', required: true, maxLength: 120 },
            { name: 'ctaLabel', label: 'Button', type: 'text', required: true, maxLength: 32 },
          ],
        },
      ],
    },
  ],
}
