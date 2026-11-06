import { mongooseAdapter } from '@payloadcms/db-mongodb'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Products } from './cms/collections/Products'
import { Users } from './cms/collections/Users'
import { Home } from './cms/globals/Home'
import { Site } from './cms/globals/Site'
import { seed } from './cms/seed'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const secret = process.env.PAYLOAD_SECRET ?? ''
if (secret.length < 32) {
  throw new Error('PAYLOAD_SECRET must be at least 32 random characters. See .env.example.')
}

/* MongoDB: a local server in development, MongoDB Atlas in production.
   MONGODB_URI is the name Vercel's MongoDB Atlas integration sets. */
const databaseURL = process.env.DATABASE_URL || process.env.MONGODB_URI
if (!databaseURL?.startsWith('mongodb')) {
  throw new Error('DATABASE_URL must be a MongoDB connection string (mongodb:// or mongodb+srv://). See .env.example.')
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
  db: mongooseAdapter({
    url: databaseURL,
    /* Each serverless instance keeps its own pool; a small one keeps many
       instances under Atlas's connection limit (500 on the free tier). */
    connectOptions: { maxPoolSize: 10 },
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
