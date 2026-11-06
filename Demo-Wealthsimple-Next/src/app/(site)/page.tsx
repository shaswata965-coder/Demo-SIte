import { About } from './_components/About'
import { Behaviours } from './_components/Behaviours'
import { Close } from './_components/Close'
import { Footer } from './_components/Footer'
import { DemoBanner, Header } from './_components/Header'
import { Hero } from './_components/Hero'
import { Intro } from './_components/Intro'
import { Newsletter } from './_components/Newsletter'
import { ProductMenu, ProductSection } from './_components/Products'
import { getContent } from './_lib/content'

/* The home page, in the reference's order: opener, product menu, product
   heroes either side of the statement, newsletter, close. */
export default async function HomePage() {
  const { home, site, before, after, menu } = await getContent()
  return (
    <>
      <Intro tagline={home.about.heading} />
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <DemoBanner links={site.demoLinks ?? []} />
      <Header products={menu} site={site} />
      <main id="main">
        <Hero hero={home.hero} />
        <ProductMenu products={menu} />
        {before.map((p) => (
          <ProductSection product={p} key={p.id} />
        ))}
        <About about={home.about} />
        {after.map((p) => (
          <ProductSection product={p} key={p.id} />
        ))}
        <Newsletter newsletter={home.newsletter} />
        <Close close={home.close} contact={site.contact} />
      </main>
      <Footer products={menu} site={site} newsletterName={home.newsletter.name} />
      <Behaviours />
    </>
  )
}
