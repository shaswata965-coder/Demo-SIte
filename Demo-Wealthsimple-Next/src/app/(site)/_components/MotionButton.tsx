/* Every moving section has one. They share a single choice for the whole
   page, kept in sync by _lib/site.js. */
export function MotionButton() {
  return (
    <button className="motion-btn" type="button" data-motion-toggle="" aria-label="Pause animations" aria-pressed="false">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path className="i-pause" d="M9 7v10M15 7v10" />
        <path className="i-play" d="M9 6.5v11l9-5.5z" />
      </svg>
    </button>
  )
}
