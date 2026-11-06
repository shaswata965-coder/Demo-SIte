import { sqliteAdapter } from '@payloadcms/db-sqlite'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Products } from './cms/collections/Products'
import { Users } from './cms/collections/Users'
import { Home } from './cms/globals/Home'
import { Site } from './cms/globals/Site'
import { seed } from './cms/seed'
import { migrations } from './migrations'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const secret = process.env.PAYLOAD_SECRET ?? ''
if (secret.length < 32) {
  throw new Error('PAYLOAD_SECRET must be at least 32 random characters. See .env.example.')
}

/* The origins this app is served from. The admin's session cookie is only
   honoured on requests that come from one of them. On Vercel they are read
   from its system variables (the production domain, the branch URL and the
   deployment's own URL), so production and every preview can sign in with
   no setup; NEXT_PUBLIC_SERVER_URL adds one more, such as a second domain.
   No serverURL is set, so the admin calls its API on whichever of these it
   was opened from. */
const https = (host?: string) => (host ? `https://${host}` : undefined)
const origins = [
  process.env.NEXT_PUBLIC_SERVER_URL,
  https(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  https(process.env.VERCEL_BRANCH_URL),
  https(process.env.VERCEL_URL),
].filter((o): o is string => Boolean(o))
if (origins.length === 0) origins.push('http://localhost:3000')

export default buildConfig({
  secret,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Larch CMS' },
    /* Payload's default avatar is Gravatar, which would send a hash of each
       editor's email to a third party (and the CSP blocks it anyway). */
    avatar: 'default',
  },
  collections: [Products, Users],
  globals: [Home, Site],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || 'file:./larch.db',
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    },
    /* Development syncs the schema automatically; production only ever
       applies the committed migrations in src/migrations. */
    prodMigrations: migrations,
  }),
  /* Smallest surface that still runs the admin: no GraphQL endpoint or
     playground, cookies accepted only from this site, no cross-origin API. */
  graphQL: { disable: true },
  csrf: origins,
  cors: [],
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  onInit: seed,
})
