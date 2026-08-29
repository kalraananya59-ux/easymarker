import Link from "next/link";
import styles from "./page.module.css";

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const FEATURES = [
  {
    title: "Pin feedback anywhere",
    text: "Click directly on a live website, image, or PDF page to leave a comment tied to that exact spot.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 21c-4-4-7-7.58-7-11a7 7 0 0114 0c0 3.42-3 7-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    title: "No signup for reviewers",
    text: "Share a link. Anyone can leave feedback in seconds — just a name, no account required.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: "Export & share reports",
    text: "Turn every round of feedback into a clean CSV or PDF report, ready for your team or client.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
        <path d="M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div>
      <nav className={styles.nav}>
        <span className={styles.logo}>Easymarker</span>
        <div className={styles.navActions}>
          <Link href="/signin" className={styles.navLink}>
            Sign in
          </Link>
          <Link href="/signup" className="btn btnPrimary btnSm">
            Sign up free
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <span className={styles.eyebrow}>No credit card required</span>
        <h1 className={styles.headline}>
          Website feedback <em>without the friction</em>
        </h1>
        <p className={styles.subhead}>
          Share a link to any website, image, or PDF. Reviewers pin comments exactly where they mean
          them — no downloads, no accounts, no back-and-forth over email.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/signup" className="btn btnPrimary">
            Start for free
          </Link>
          <Link href="/signin" className="btn btnSecondary">
            Sign in
          </Link>
        </div>
        <p className={styles.ctaHint}>Free forever for small projects. Upgrade any time.</p>
      </header>

      <div className={styles.previewWrap}>
        <div className={styles.preview}>
          <div className={styles.previewChrome}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewLine} style={{ width: "60%" }} />
            <div className={styles.previewLine} style={{ width: "80%" }} />
            <div className={styles.previewLine} style={{ width: "40%" }} />
            <div className={styles.previewPin} style={{ left: "35%", top: "70%" }} />
            <div className={styles.previewCard}>
              <p className={styles.previewCardName}>Sam</p>
              <p className={styles.previewCardText}>Can we make this button bigger?</p>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.features}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className={`card ${styles.feature}`}>
            <div className={styles.featureIcon}>{feature.icon}</div>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p className={styles.featureText}>{feature.text}</p>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerText}>© {new Date().getFullYear()} Easymarker</p>
      </footer>
    </div>
  );
}
