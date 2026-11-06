import type { Access, FieldAccess } from 'payload'

/* Who may do what in the admin. The public page never goes through these:
   it reads with Payload's Local API on the server. So nothing here is
   readable over /api by a visitor who is not signed in. */

type WithRole = { role?: string | null } | null | undefined
const role = (user: unknown) => (user as WithRole)?.role

export const signedIn: Access = ({ req }) => Boolean(req.user)
export const admins: Access = ({ req }) => role(req.user) === 'admin'
export const adminsField: FieldAccess = ({ req }) => role(req.user) === 'admin'

/* Admins see and edit every account; an editor only their own. */
export const adminsOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (role(req.user) === 'admin') return true
  return { id: { equals: req.user.id } }
}
