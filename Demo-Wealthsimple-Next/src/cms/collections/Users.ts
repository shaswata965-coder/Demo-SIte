import { ValidationError, type CollectionConfig } from 'payload'

import { admins, adminsField, adminsOrSelf } from '../access'

const MIN_PASSWORD = 12

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
    group: 'Settings',
  },
  auth: {
    /* Sessions last two hours; five wrong passwords lock the account for
       fifteen minutes. Cookies are first-party only and HTTPS-only in
       production. No API keys: every change is made by a signed-in person. */
    tokenExpiration: 60 * 60 * 2,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useAPIKey: false,
    cookies: {
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    admin: ({ req }) => Boolean(req.user),
    read: adminsOrSelf,
    create: admins,
    update: adminsOrSelf,
    delete: admins,
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        const pw = (data as { password?: unknown } | undefined)?.password
        if (typeof pw === 'string' && pw.length < MIN_PASSWORD) {
          throw new ValidationError({
            collection: 'users',
            errors: [{ path: 'password', message: `Use at least ${MIN_PASSWORD} characters.` }],
            req,
          })
        }
        return data
      },
    ],
    beforeChange: [
      /* The very first account is always an admin, whoever creates it. */
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
        return totalDocs === 0 ? { ...data, role: 'admin' } : data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Admin: content and accounts', value: 'admin' },
        { label: 'Editor: content only', value: 'editor' },
      ],
      access: { create: adminsField, update: adminsField },
      admin: { position: 'sidebar' },
    },
  ],
}
