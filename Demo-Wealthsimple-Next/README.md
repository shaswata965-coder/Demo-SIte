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
- Login throttling is per account, not per IP address. Put the admin behind the
  host's WAF or an access proxy (Cloudflare Access, Vercel deployment
  protection) for a public deployment.

## Deploying

The SQLite file is fine on a single server with a disk. On a serverless host
(Vercel, Netlify) the file system is thrown away, so point `DATABASE_URL` at a
hosted libSQL database such as Turso (`libsql://…`, with `DATABASE_AUTH_TOKEN`):
the same adapter, no code change. Set `NEXT_PUBLIC_SERVER_URL` to the public URL,
and `PAYLOAD_SECRET` and `ADMIN_*` in the host's secret settings.

After changing a collection or global, create a migration and commit it:

```bash
pnpm payload migrate:create describe-the-change
```

Then regenerate the types:

```bash
pnpm generate:types
```

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
