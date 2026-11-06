import { revalidatePath } from 'next/cache'

/* The home page is static HTML. Saving anything it shows rebuilds it in the
   background, so the next visitor gets the new copy without a deploy.
   Seeding passes context.skipRevalidate: it runs at start-up, outside any
   request, where there is nothing to revalidate yet. */
export function revalidateHome(context: Record<string, unknown> | undefined) {
  if (context?.skipRevalidate) return
  try {
    revalidatePath('/')
  } catch {
    /* outside a Next.js request (a CLI script); nothing is cached there */
  }
}
