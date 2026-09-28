import Link from "next/link";
import { Logo, LogoMark } from "./Logo";
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
    text: "Click directly on a live website to leave a comment tied to that exact spot — not a vague line number or a screenshot with an arrow drawn on it.",
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
    title: "Invite by email",
    text: "Enter a reviewer's email and they get a direct link in their inbox — no need to copy-paste and message it yourself.",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  {
    title: "Track comment status",
    text: "Mark every pin open, in progress, or resolved — so nothing quietly falls through the cracks between rounds.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    ),
  },
  {
    title: "Works on real websites",
    text: "Not a static screenshot — reviewers see the live, working site and pin comments on the actual rendered page.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" />
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

const STEPS = [
  {
    n: "1",
    title: "Paste a link",
    text: "Drop in the URL of the site you want reviewed. No setup, no install.",
  },
  {
    n: "2",
    title: "Share it",
    text: "Send the review link to anyone — a client, a teammate, a stranger. They don't need an account.",
  },
  {
    n: "3",
    title: "Watch pins land",
    text: "Every comment shows up on your dashboard, tied to the exact spot it was left.",
  },
];

const TESTIMONIAL_PLACEHOLDERS = [1, 2, 3];

export default function HomePage() {
  return (
    <div>
      <div className={styles.announceBar}>
        <span>New: Sign in with Google is here.</span>
      </div>

      <nav className={styles.nav}>
        <Logo />
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#pricing" className={styles.navLink}>
            Pricing
          </a>
        </div>
        <div className={styles.navActions}>
          <Link href="/signin" className="btn btnSecondary btnSm">
            Log in
          </Link>
          <Link href="/signup" className="btn btnPrimary btnSm">
            Sign up
          </Link>
        </div>
      </nav>

      <div className={styles.heroGlow} aria-hidden="true" />

      <section className={styles.heroSplit}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>No credit card required</span>
          <h1 className={styles.headline}>
            Get client approval on your websites, <em>without the back-and-forth</em>.
          </h1>
          <p className={styles.subhead}>
            Share a link to any website. Reviewers pin comments exactly where they mean them — no
            downloads, no accounts, no email threads.
          </p>

          <blockquote className={styles.placeholderQuote}>
            <span className={styles.placeholderTag}>Placeholder — swap in a real customer quote</span>
            <p>&ldquo;Your customer&apos;s testimonial will go here.&rdquo;</p>
            <footer>Name, role — Company</footer>
          </blockquote>

          <div className={styles.ctaRow}>
            <Link href="/signup" className="btn btnPrimary">
              Start for free
            </Link>
            <Link href="/signin" className="btn btnSecondary">
              Sign in
            </Link>
          </div>
          <p className={styles.ctaHint}>Free forever for small projects. Upgrade any time.</p>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewChrome}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <div className={styles.previewUrlBar}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              yoursite.com
            </div>
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewNavLine} />
            <div className={styles.previewHeroBlock}>
              <div className={styles.previewLine} style={{ width: "70%", height: 14 }} />
              <div className={styles.previewLine} style={{ width: "45%" }} />
              <div className={styles.previewImgBlock} />
            </div>

            <button type="button" className={styles.previewPin} style={{ left: "30%", top: "36%" }} aria-hidden="true">
              <span className={styles.previewPinNumber}>1</span>
            </button>
            <div className={styles.previewCard} style={{ left: "34%", top: "40%" }}>
              <p className={styles.previewCardName}>Sam</p>
              <p className={styles.previewCardText}>Can we make this button bigger?</p>
            </div>

            <button
              type="button"
              className={`${styles.previewPin} ${styles.previewPinResolved}`}
              style={{ left: "72%", top: "68%" }}
              aria-hidden="true"
            >
              <span className={styles.previewPinNumber}>2</span>
            </button>
            <div className={`${styles.previewCard} ${styles.previewCardAlt}`} style={{ right: "4%", top: "72%" }}>
              <p className={styles.previewCardName}>Priya · resolved</p>
              <p className={styles.previewCardText}>Love this section — nice work.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsBand}>
        <div className={styles.statsBandInner}>
          <h2 className={styles.statsHeading}>Your client opens a link. That&apos;s the whole onboarding.</h2>
          <p className={styles.statsText}>
            Every other review tool asks the person you&apos;re billing to create a password first.
            Easymarker doesn&apos;t. Reviewers land, click, type — that&apos;s the only thing we ever
            ask, and only once.
          </p>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <p className={styles.statNumber}>0</p>
              <p className={styles.statLabel}>accounts for reviewers</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statNumber}>3</p>
              <p className={styles.statLabel}>free projects, always</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statNumber}>1</p>
              <p className={styles.statLabel}>link is all it takes</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.steps}>
        <h2 className={styles.sectionHeading}>How it works</h2>
        <div className={styles.stepsRow}>
          {STEPS.map((step, i) => (
            <div key={step.n} className={styles.stepItem}>
              <div className={styles.stepNumber}>{step.n}</div>
              {i < STEPS.length - 1 && <div className={styles.stepConnector} aria-hidden="true" />}
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.sectionHeading}>Everything you need to close feedback loops</h2>
        <div className={styles.features}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className={`card ${styles.feature}`}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureText}>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.testimonials}>
        <h2 className={styles.sectionHeading}>What people are saying</h2>
        <p className={styles.testimonialsSubhead}>
          We&apos;re early — these spots are reserved for real customer quotes as they come in.
        </p>
        <div className={styles.testimonialsGrid}>
          {TESTIMONIAL_PLACEHOLDERS.map((i) => (
            <div key={i} className={`card ${styles.testimonialCard}`}>
              <span className={styles.placeholderTag}>Placeholder</span>
              <p className={styles.testimonialText}>&ldquo;A real customer quote will go here.&rdquo;</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar} aria-hidden="true" />
                <div>
                  <p className={styles.testimonialName}>Name Surname</p>
                  <p className={styles.testimonialRole}>Role, Company</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className={styles.pricing}>
        <h2 className={styles.sectionHeading}>Pay for the people who fix things.</h2>
        <p className={styles.pricingSubhead}>Reviewers are always free and always unlimited.</p>
        <div className={styles.pricingGrid}>
          <div className={`card ${styles.plan}`}>
            <p className={styles.planName}>Free</p>
            <p className={styles.planPrice}>
              $0<span>/forever</span>
            </p>
            <p className={styles.planDesc}>Try it out on real projects.</p>
            <ul className={styles.planFeatures}>
              <li>3 active projects</li>
              <li>10 comments per project</li>
              <li>Unlimited reviewers</li>
              <li>Website review</li>
            </ul>
            <Link href="/signup" className="btn btnSecondary" style={{ width: "100%" }}>
              Start free
            </Link>
          </div>

          <div className={`card ${styles.plan} ${styles.planFeatured}`}>
            <span className={styles.planBadge}>Most popular</span>
            <p className={styles.planName}>Pro</p>
            <p className={styles.planPrice}>
              $19<span>/month</span>
            </p>
            <p className={styles.planDesc}>For agencies shipping client work weekly.</p>
            <ul className={styles.planFeatures}>
              <li>25 active projects</li>
              <li>Unlimited comments</li>
              <li>Unlimited reviewers</li>
              <li>Full comment history</li>
            </ul>
            <Link href="/signup" className="btn btnPrimary" style={{ width: "100%" }}>
              Start with Pro
            </Link>
          </div>

          <div className={`card ${styles.plan}`}>
            <p className={styles.planName}>Agency</p>
            <p className={styles.planPrice}>
              $49<span>/month</span>
            </p>
            <p className={styles.planDesc}>For teams running many client links at once.</p>
            <ul className={styles.planFeatures}>
              <li>Unlimited projects</li>
              <li>Unlimited comments</li>
              <li>Unlimited reviewers</li>
              <li>Priority support</li>
            </ul>
            <Link href="/signup" className="btn btnSecondary" style={{ width: "100%" }}>
              Start with Agency
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalCtaGlow} aria-hidden="true" />
        <h2 className={styles.finalCtaHeading}>You&apos;re one link away from your next round of feedback.</h2>
        <Link href="/signup" className="btn btnPrimary">
          Start for free
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <LogoMark size={18} />
          <div className={styles.footerLinks}>
            <a href="#features" className={styles.footerLink}>
              Features
            </a>
            <a href="#pricing" className={styles.footerLink}>
              Pricing
            </a>
            <Link href="/signin" className={styles.footerLink}>
              Sign in
            </Link>
          </div>
        </div>
        <p className={styles.footerText}>© {new Date().getFullYear()} Easymarker</p>
      </footer>
    </div>
  );
}
