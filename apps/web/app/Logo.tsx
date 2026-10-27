// The pin shape mirrors the actual comment-pin markers used throughout the
// product (see ReviewOverlay/UrlReviewOverlay) — the logo is a refined
// version of the same mark users place feedback with, not an unrelated icon.
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="em-mark" x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A58CFF" />
          <stop offset="1" stopColor="#FF5FA8" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5c-4.14 0-7.5 3.36-7.5 7.5 0 5.5 6.2 10.6 7.13 11.34a.55.55 0 00.74 0C13.3 20.6 19.5 15.5 19.5 10c0-4.14-3.36-7.5-7.5-7.5z"
        fill="url(#em-mark)"
      />
      <circle cx="12" cy="10" r="3" fill="var(--page-bg)" />
    </svg>
  );
}

export function Logo({ size = 22, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <LogoMark size={size} />
      {withWordmark && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--navy-900)",
          }}
        >
          Easymarker
        </span>
      )}
    </span>
  );
}
