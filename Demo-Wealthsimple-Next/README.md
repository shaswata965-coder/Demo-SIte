# Demo-Wealthsimple-Next

The Larch homepage from [`Demo-Wealthsimple/`](../Demo-Wealthsimple/), ported
to **Next.js 16** with a **Payload 3** admin panel at `/admin`. The page looks
and moves exactly as the static version does. Every word on it now comes from
the CMS, and saving in the admin updates the live page without a deploy.

*Larch is fictional. Every institution, person, quote and figure is invented.*

## Run it

Needs Node 22.23.4+ (or 24.22.1+) and pnpm 10.16+.

```bash
cd Demo-Wealthsimple-Next
```

```bash
pnpm install
```

```bash
cp .env.example .env
```

Fill in `.env`: a `PAYLOAD_SECRET` of at least 32 random characters (the file
shows a one-liner that makes one), and `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the
first account.

```bash
pnpm dev
```

Open http://localhost:3000 for the site and http://localhost:3000/admin for
the CMS. On first start the database (`larch.db`, a local SQLite file) is
created, filled with the page's current copy, and the admin account is made.

For a production build:

```bash
pnpm build
```

```bash
pnpm start
```

## What the admin edits

| In the admin | On the page |
|---|---|
| **Home page → Opener** | Eyebrow, headline, email form labels and both form messages, fine print |
| **Home page → Layout** | Which product sections sit above and below "Why Larch", in order (drag to reorder) |
| **Home page → Why Larch** | The giant statement, the thesis that lights up as you read, the fine print |
| **Home page → Newsletter** | Name, description, button, editor's note |
| **Home page → Close** | The fixed part of the headline, the words its last line turns through, sub-line, button |
| **Products** (5) | Name in the big menu, full title, both menu lines, headline, one or two buttons, colour room, picture, menu order |
| **Site settings** | Search title and description, header and phone-menu buttons, contact details, footer text, the "More demos" strip |
| **Users** | Accounts. Admins manage content and accounts; editors manage content only |

The five product pictures (the phone, the metal model card, the payments
monitor, the forecast slab, the risk donut) and the two canvas scenes are drawn
in code, so they are chosen, not edited: a product picks one of the five
pictures and one of the nine solved colour rooms. An editor can't enter a
colour that fails contrast, or a link that isn't `#section`, `/path`,
`https://…` or `mailto:…`.

Every product and both page globals keep their last 25 versions, so any save
can be compared and restored from the admin.

## How the port maps

| Static demo | Here |
|---|---|
| `index.html` | `src/app/(site)/page.tsx` and one server component per section in `_components/`, fed by `_lib/content.ts` |
| The product pictures in `index.html` | `src/app/(site)/_pictures/`, converted to JSX (the fraud feed is now one data list rendered twice) |
| `css/*.css` | `src/app/(site)/styles/`, unchanged except the two font tokens and the entrance rules noted below |
| `js/site.js`, `js/banner.js` | `_lib/site.js`, the same code wrapped to start on mount and release everything on unmount |
| `js/scenes.js` | `_lib/scenes.js`, the same, plus the canvas text reading the page's font token |
| The opener's form, the copy button, the turning last word | React client components: `LeadForm`, `ContactEmail`, `Endings` |
| Google Fonts `<link>` | `next/font`, which downloads Jost and Newsreader at build time and serves them from this site |
| The early inline script | The same script, in `layout.tsx`'s `<head>` |

Two deliberate changes:

- **Headlines are split into words on the server** (`SplitWords`), so the words
  are in the HTML from the first byte and nothing reflows when the script
  starts. The word boxes, masks and the thesis's dimming in `main.css` are now
  scoped to `.at-on`, so with reduced motion or no script a split headline
  reads exactly like plain text, as before.
- **The opening is hidden when it ends rather than removed**, because React
  owns that element.

`tools/` stays in `Demo-Wealthsimple/`: `solve-palette.mjs` writes
`css/tokens.css` and `draw-assets.mjs` the forecast chart. After running either,
copy `tokens.css` to `src/app/(site)/styles/`, or the regenerated chart into
`_pictures/Forecasting.tsx`.

## Security

Chosen with the 2025–2026 Next.js and Payload advisories in mind.

- **Patched versions, pinned exactly**: Next 16.4.5 (after the October image
  optimizer RCE and the November cache advisories) and Payload 3.93.0 (after
  the September–October SQL injection, upload and auth fixes). `pnpm` refuses
  any version published less than 24 hours ago and lets only esbuild run an
  install script (`pnpm-workspace.yaml`).
- **The public page is static HTML.** It reads the CMS on the server through
  Payload's Local API when it is built or revalidated; visitors never touch the
  database or the API.
- **Nothing in the API is public.** Every collection and global needs a signed-in
  user to read over `/api`. GraphQL is switched off. Cross-origin requests
  carrying the admin cookie are ignored.
- **The image optimizer is off** (`/_next/image` answers 404), since that is
  where Next.js's critical 2026 RCE lived and this site does not use it. There
  are no file uploads at all.
- **Accounts**: two roles; editors can't create accounts, delete products or
  promote themselves. Passwords need 12+ characters; five wrong ones lock the
  account for 15 minutes; sessions last two hours in an `HttpOnly`,
  `SameSite=Strict` cookie that is `Secure` in production. No API keys.
- **No open sign-up.** Until an account exists, Payload lets anyone create the
  first user. This app creates it from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and in
  production refuses to start without them.
- **Headers** on every response: a Content Security Policy that only allows this
  origin, plus HSTS, `nosniff`, `X-Frame-Options`, a strict referrer policy,
  COOP and a Permissions-Policy. Fonts are self-hosted, and the admin's avatar
  doesn't use Gravatar, so no visitor or editor request goes to a third party.
- **Schema changes ship as migrations** (`src/migrations`) applied on start;
  production never auto-alters the database.

Known gaps, deliberately left for now:

- The CSP allows inline scripts. Next.js writes its own inline bootstrap into
  static pages, and the per-request nonces that would remove it would also make
  the page dynamic.
- There is no email adapter, so a password-reset email is written to the server
  log rather than sent. Add one (e.g. `@payloadcms/email-resend`) before real
  editors rely on it.
- Login throttling is per account, not per IP address. On Vercel, add the
  firewall rate limit described under "Deploying to Vercel".

## Deploying to Vercel

The site needs a database that outlives a deploy, because Vercel throws its file
system away. Use a hosted libSQL database from [Turso](https://turso.tech): it is
the same SQLite adapter, so no code changes. Turso's free tier is enough.

### 1. Create the database

Install the [Turso CLI](https://docs.turso.tech/cli/installation) and sign in:

```bash
turso auth login
```

Create the database. Ideally put it in the same region as your Vercel
functions, which default to Washington, D.C. (`iad1`).

```bash
turso db create larch
```

Print its URL (`libsql://larch-<you>.turso.io`):

```bash
turso db show --url larch
```

Create a token for it:

```bash
turso db tokens create larch
```

Make a secret for signing admin sessions:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 2. Import the project

1. In Vercel, **Add New → Project**, and import `shaswata965-coder/Demo-SIte`.
2. **Root Directory**: click Edit and choose `Demo-Wealthsimple-Next`.
3. **Framework Preset**: Next.js (detected). Leave the build and install
   commands as they are.
4. **Environment Variables**: add these before the first deploy.

| Name | Value |
|---|---|
| `PAYLOAD_SECRET` | the secret from step 1 |
| `DATABASE_URL` | the `libsql://…` URL |
| `DATABASE_AUTH_TOKEN` | the token |
| `ADMIN_EMAIL` | the first admin's email |
| `ADMIN_PASSWORD` | 12+ characters; only used while there is no account |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`, so Vercel installs with the pnpm version pinned in `package.json` (10.28.0), which honours the 24-hour release delay and the install-script allow-list |

5. Deploy.

The build log should show pnpm 10.28.0 and Node 22. You should also see
`Migrating: 20261106_112715_initial`, `Created the first admin` and
`Seeding the Larch content` (on the first deploy only), and `○ /` in the
route list. Node is pinned to 22 by `engines` in `package.json`, which
overrides the project's Node setting.

You don't need to set a site URL. The admin accepts its session cookie only
from the project's production domain, its branch URLs and the deployment's own
URL, which Vercel provides (`src/payload.config.ts`). To use the admin from
another domain as well, set `NEXT_PUBLIC_SERVER_URL` to it.

### 3. After the first deploy

1. Open `https://<your-project>.vercel.app/admin`, sign in, and change the
   password from your account page.
2. In **Settings → Environment Variables**, delete `ADMIN_PASSWORD` and
   `ADMIN_EMAIL`. They are only read when the database has no accounts.
3. Scope `DATABASE_URL`, `DATABASE_AUTH_TOKEN` and `PAYLOAD_SECRET` to
   **Production** only. Otherwise a preview build would run its migrations
   against the live database, and preview edits would change the live site.
   For previews, make a second database (`turso db create larch-preview`) and
   add the same names scoped to **Preview**, with their own secret and
   `ADMIN_*`. Or turn preview deployments off.
4. **Domains**: add your domain. The admin follows it automatically.
   Afterwards, use that domain (not `<project>.vercel.app`) for `/admin`, or
   add the old address with `NEXT_PUBLIC_SERVER_URL`.
5. **Firewall → Rate limiting**: add a rule for `/api/users/login`, for
   example 10 requests a minute per IP. Payload's own lockout is per account;
   this adds a limit per IP address. One rule is included on the Hobby plan.
6. Keep **Deployment Protection** on for previews (the default).

The Vercel Toolbar on preview deployments loads from `vercel.live`, which the
site's content security policy blocks. Turn the toolbar off for the project if
the console errors bother you; production is unaffected.

### Day to day

- Editing content needs no deploy: saving in `/admin` rebuilds the page in the
  background.
- Pushing to `main` deploys code.
- After changing a collection or global, create a migration and commit it. The
  next deploy applies it before the site starts.

```bash
pnpm payload migrate:create describe-the-change
```

Then regenerate the types:

```bash
pnpm generate:types
```

### Elsewhere

On any server with a disk (a VPS, Docker with a volume), the local SQLite file
is fine: set the same variables, then `pnpm build` and `pnpm start`.

## Verified

Checked with Playwright against a production build in this container:

- **Same page as the static demo.** Full-page screenshots of both, with reduced
  motion, at 1440 and 390 wide: every section the same height and the same
  total length (9,794 px and 9,313 px). The only pixel differences are the two
  canvas scenes' still frames, which depend on timing.
- **Layout.** No horizontal scroll and no text off screen at 320, 360, 390, 768,
  1024, 1280, 1440, 1920 and 2560 wide, in light and dark. No page errors or
  console errors, and no hydration warnings in development either.
- **Motion and interactions.**
  - The opening plays, hands over, and is skipped by a key.
  - Headlines rise word by word; sections replay on return; the thesis lights up.
  - The last word turns, and holds while paused.
  - Pause, theme and the demos strip are remembered across a reload.
  - The form shows both messages, and copy fills the clipboard.
  - The Products menu closes after a link is chosen.
- **Admin.**
  - Sign-in works, and an edit to the opener's headline appears on the public
    page without a rebuild.
  - A `javascript:` link and a short password are refused.
  - The editor role's limits hold (above).
  - A foreign-origin request gets no user.
  - Six wrong passwords lock the account.
  - Anonymous `/api` reads get 403, `/api/graphql` and `/_next/image` 404,
    and first-user sign-up is closed.
