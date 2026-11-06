/* The larch: a trunk and three pairs of branches, a decision tree's splits. */
export const MARK_PATH = 'M12 3v18M12 7.5 8.6 10.4M12 7.5l3.4 2.9M12 11.5l-5 4M12 11.5l5 4M12 15.5l-6.5 5M12 15.5l6.5 5'

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d={MARK_PATH} />
    </svg>
  )
}
