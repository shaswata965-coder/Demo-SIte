import type { Payload } from 'payload'

/* First start: fill an empty database with the page as it stands in
   Demo-Wealthsimple/index.html, and create the first admin. Each part runs
   only when its table is empty, so a restart never overwrites an edit. */

const ctx = { skipRevalidate: true }

const PRODUCTS = [
  {
    name: 'Credit',
    slug: 'credit',
    title: 'Credit decisioning',
    navBlurb: 'Scores and plain reasons for every application',
    menuDescription: 'Approve more good borrowers, with a plain reason for every decline',
    headline: 'Approve more good borrowers, with a plain reason behind every decline.',
    ctas: [
      { label: 'Review my credit model', href: '#contact', style: 'solid' },
      { label: 'See its model card', href: '#governance', style: 'ghost' },
    ],
    picture: 'credit',
    room: 'petrol',
    menuOrder: 10,
  },
  {
    name: 'Fraud',
    slug: 'fraud',
    title: 'Fraud and AML',
    navBlurb: 'Mule rings and account takeover, caught in flight',
    menuDescription: 'Find mule rings and account takeovers while the money is still there',
    headline: 'Catch mule rings while the money is still in the account.',
    ctas: [{ label: 'Review my fraud model', href: '#contact', style: 'solid' }],
    picture: 'fraud',
    room: 'oxblood',
    menuOrder: 20,
  },
  {
    name: 'Forecasting',
    slug: 'forecasting',
    title: 'Liquidity forecasting',
    navBlurb: 'Sixty days of cash, with the range around it',
    menuDescription: 'Sixty days of cash and liquidity, with the range around it',
    headline: 'Know your cash low point a month before it arrives.',
    ctas: [{ label: 'Review my forecast', href: '#contact', style: 'solid' }],
    picture: 'forecasting',
    room: 'dawn',
    menuOrder: 30,
  },
  {
    name: 'Risk',
    slug: 'risk',
    title: 'Portfolio risk',
    navBlurb: 'Factor exposure and stress across every book',
    menuDescription: 'Factor exposure and stress scenarios across every book',
    headline: 'See which factor drives your risk, and what a hedge would change.',
    ctas: [{ label: 'Review my risk model', href: '#contact', style: 'solid' }],
    picture: 'risk',
    room: 'fog',
    menuOrder: 40,
  },
  {
    name: 'Governance',
    slug: 'governance',
    title: 'Model governance',
    navBlurb: 'Model cards, validation and the audit trail',
    menuDescription: 'Model cards, validation and an audit trail your regulator can read',
    headline: 'Every model ships with a model card your validators can sign.',
    ctas: [{ label: 'Get a sample model card', href: '#contact', style: 'solid' }],
    picture: 'governance',
    room: 'olive',
    menuOrder: 50,
  },
] as const

/* The page order of the reference: two products, the statement, three more. */
const BEFORE_ABOUT = ['credit', 'governance']
const AFTER_ABOUT = ['fraud', 'forecasting', 'risk']

const HOME = {
  hero: {
    eyebrow: 'The 2026 Model Review',
    headline: 'Show us one model. We’ll explain every decision it made.',
    emailPlaceholder: 'Work email',
    buttonLabel: 'Book a review',
    finePrint:
      'Free for regulated lenders, banks and asset managers in Canada and the US. Four weeks, one model, and your data stays in your own cloud.',
    thanksMessage:
      'Thanks. This page is a demo, so nothing was sent. To reach the team, write to hello@larch.example.',
    invalidMessage: 'Enter a work email, like name@yourbank.com.',
  },
  about: {
    heading: 'Machine learning, accounted for',
    thesis:
      'Why are we here? Because the models that decide who gets a loan, which payment gets stopped and how much cash a bank keeps on hand were too often black boxes. So we build models that are accurate, watched every day and explained in plain words, until a credit officer, a validator and a regulator can each read every decision. Built for the people who answer for them.',
    finePrint:
      'Larch is a fictional company made for this design demo. Every institution, person, quote and figure on this page is invented.',
  },
  newsletter: {
    name: 'The Residual',
    description:
      'A fortnightly note on models, money and the people who audit them. Short enough to finish before the risk committee starts.',
    ctaLabel: 'Read the latest issue',
    ctaHref: '#contact',
    note: 'Edited by Priya Raman, chief scientist. The portrait is an illustration.',
  },
  close: {
    lead: 'Every decision, explained to your',
    endings: [{ word: 'regulator.' }, { word: 'auditors.' }, { word: 'board.' }, { word: 'customers.' }],
    sub: 'Trusted by 41 banks, lenders and asset managers in Canada and the US.',
    ctaLabel: 'Book a model review',
  },
}

const PAGES = 'https://shaswata965-coder.github.io/Demo-SIte'

const SITE = {
  seo: {
    title: 'Larch — machine learning, accounted for',
    description:
      'Larch builds and runs credit, fraud, forecasting and risk models for banks, lenders and asset managers, and explains every decision they make. A fictional company.',
  },
  headerCta: 'Book a review',
  menuCta: 'Book a model review',
  contact: { email: 'hello@larch.example', phone: '+1 416 555 0142', offices: 'Toronto and New York' },
  footer: {
    legal:
      'Larch is a fictional company created for a design demo. Every institution, person, quote and figure on this page is invented, and nothing here is an offer of credit or financial advice. The page borrows its structure and motion from a published consumer-finance site; its colours, type, copy and pictures are its own.',
    copyright: '© 2026 Larch',
  },
  demoLinks: [
    { label: 'AXON', reference: 'Totem', href: `${PAGES}/Demo-Totem/` },
    { label: 'AXON Flight', reference: 'craftedbygc', href: `${PAGES}/demo-crafted/` },
  ],
}

export async function seed(payload: Payload): Promise<void> {
  await seedAdmin(payload)

  const { totalDocs } = await payload.count({ collection: 'products' })
  if (totalDocs > 0) return

  payload.logger.info('Seeding the Larch content.')
  const ids: Record<string, number | string> = {}
  for (const p of PRODUCTS) {
    const doc = await payload.create({
      collection: 'products',
      data: { ...p, ctas: p.ctas.map((c) => ({ ...c })) },
      context: ctx,
    })
    ids[p.slug] = doc.id
  }
  await payload.updateGlobal({
    slug: 'home',
    data: {
      ...HOME,
      productsBeforeAbout: BEFORE_ABOUT.map((s) => ids[s] as number),
      productsAfterAbout: AFTER_ABOUT.map((s) => ids[s] as number),
    },
    context: ctx,
  })
  await payload.updateGlobal({ slug: 'site', data: SITE, context: ctx })
}

async function seedAdmin(payload: Payload) {
  const { totalDocs } = await payload.count({ collection: 'users' })
  if (totalDocs > 0) return

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (email && password) {
    await payload.create({
      collection: 'users',
      data: { email, password, name: 'Admin', role: 'admin' },
      context: ctx,
    })
    payload.logger.info(`Created the first admin, ${email}.`)
    return
  }
  /* With no account, /admin offers "create first user" to whoever arrives
     first. Fine on a laptop; never on a server. */
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'No admin account exists and ADMIN_EMAIL / ADMIN_PASSWORD are not set. Refusing to start with first-user sign-up open to anyone.',
    )
  }
  payload.logger.warn('No admin yet: create one at /admin (development only), or set ADMIN_EMAIL and ADMIN_PASSWORD.')
}
