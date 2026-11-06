import type { CollectionConfig } from 'payload'

import { admins, signedIn } from '../access'
import { revalidateHome } from '../revalidate'
import { PICTURES, ROOMS } from '../rooms'
import { safeHref, safeSlug } from '../validate'

/* One document per product. Each appears in four places on the page: the
   header's Products menu, the big serif product menu, its own full-bleed
   section, and the footer. Where its section sits is set on the Home page
   (Layout tab). */
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'title', 'room', 'menuOrder'],
    description: 'The five products. Their pictures are drawn in code; the words, colours and order are yours.',
  },
  defaultSort: 'menuOrder',
  access: {
    read: signedIn,
    update: signedIn,
    create: admins,
    delete: admins,
  },
  versions: { maxPerDoc: 25 },
  hooks: {
    afterChange: [({ context }) => revalidateHome(context)],
    afterDelete: [({ context }) => revalidateHome(context)],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          maxLength: 16,
          admin: { description: 'One word, set huge in the product menu: "Credit".' },
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          validate: safeSlug,
          admin: { description: 'The section\'s anchor: /#credit.' },
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 40,
      admin: { description: 'The full name, in the header, the phone menu and the footer: "Credit decisioning".' },
    },
    {
      name: 'navBlurb',
      label: 'Header menu line',
      type: 'text',
      required: true,
      maxLength: 70,
    },
    {
      name: 'menuDescription',
      label: 'Product menu line',
      type: 'text',
      required: true,
      maxLength: 90,
      admin: { description: 'Slides in beside the name when a visitor points at it.' },
    },
    {
      name: 'headline',
      type: 'textarea',
      required: true,
      maxLength: 110,
      admin: { description: 'The section headline. It rises in word by word.' },
    },
    {
      name: 'ctas',
      label: 'Buttons',
      type: 'array',
      minRows: 1,
      maxRows: 2,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, maxLength: 32 },
            { name: 'href', label: 'Link', type: 'text', required: true, validate: safeHref },
            {
              name: 'style',
              type: 'select',
              required: true,
              defaultValue: 'solid',
              options: [
                { label: 'Solid', value: 'solid' },
                { label: 'Outline', value: 'ghost' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'picture',
      type: 'select',
      required: true,
      unique: true,
      options: [...PICTURES],
      admin: { position: 'sidebar', description: 'The looping picture behind the section.' },
    },
    {
      name: 'room',
      type: 'select',
      required: true,
      options: [...ROOMS],
      admin: { position: 'sidebar', description: 'The section\'s colours, in light and dark.' },
    },
    {
      name: 'menuOrder',
      type: 'number',
      required: true,
      defaultValue: 10,
      admin: { position: 'sidebar', description: 'Order in the menus and the footer, lowest first.' },
    },
  ],
}
