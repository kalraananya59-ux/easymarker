import Link from "next/link";
import { SiteFooter, SiteHeader } from "./SiteChrome";
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
    title: "Paste a link",
    text: "Drop in the URL of the site you want reviewed. No setup, no install.",
  },
  {
    title: "Share it",
    text: "Send the review link to anyone — a client, a teammate, a stranger. They don't need an account.",
  },
  {
    title: "Watch pins land",
    text: "Every comment shows up on your dashboard, tied to the exact spot it was left.",
  },
];

// Add real customer quotes here and the "What people are saying" section
// appears on the homepage automatically. It stays hidden while this is empty.
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Try it out on real projects.",
    features: ["3 active projects", "10 comments per project", "Unlimited reviewers", "Website review"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "month",
    desc: "For agencies shipping client work weekly.",
    features: ["25 active projects", "Unlimited comments", "Unlimited reviewers", "Full comment history"],
    cta: "Start with Pro",
    featured: true,
  },
  {
    name: "Agency",
    price: "$49",
    period: "month",
    desc: "For teams running many client links at once.",
    features: ["Unlimited projects", "Unlimited comments", "Unlimited reviewers", "Priority support"],
    cta: "Start with Agency",
    featured: false,
  },
];

const DEMO_COMMENTS = [
  { n: 1, name: "Sam", text: "Can we make this button bigger?", status: "Open", tone: "open" },
  { n: 2, name: "Leo", text: "Headline wraps on mobile — shorter line?", status: "In progress", tone: "progress" },
  { n: 3, name: "Priya", text: "Love this section — nice work.", status: "Resolved", tone: "resolved" },
];

function ReviewDemo() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.frame}>
        <div className={styles.chrome}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <div className={styles.urlBar}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            northwind.studio
          </div>
          <span className={styles.reviewing}>Reviewing with Easymarker</span>
        </div>

        <div className={styles.demoBody}>
          <div className={styles.site}>
            <div className={styles.siteNav}>
              <span className={styles.siteLogo}>Northwind</span>
              <span className={styles.siteNavLinks}>
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className={styles.siteHero}>
              <div className={styles.siteCopy}>
                <p className={styles.siteTitle}>Brand design for small, bold teams.</p>
                <span className={styles.siteLine} style={{ width: "86%" }} />
                <span className={styles.siteLine} style={{ width: "64%" }} />
                <span className={styles.siteButton}>
                  See our work
                  <svg className={styles.marker} viewBox="0 0 160 70" preserveAspectRatio="none">
                    <path d="M14 38C10 18 52 6 92 8c38 2 62 14 56 32-6 20-58 26-96 22C20 59 6 48 18 30" />
                  </svg>
                </span>
              </div>
              <div className={styles.siteImage} />
            </div>
            <div className={styles.siteCards}>
              <div />
              <div />
              <div />
            </div>

            <span className={`${styles.demoPin} ${styles.pinA}`}>
              <b>1</b>
            </span>
            <span className={`${styles.demoPin} ${styles.pinB}`}>
              <b>2</b>
            </span>
            <span className={`${styles.demoPin} ${styles.pinC}`}>
              <b>3</b>
            </span>
          </div>

          <div className={styles.panel}>
            <p className={styles.panelHead}>3 comments</p>
            {DEMO_COMMENTS.map((c) => (
              <div key={c.n} className={`${styles.panelItem} ${c.n === 1 ? styles.panelItemActive : ""}`}>
                <div className={styles.panelMeta}>
                  <span className={`${styles.panelNum} ${styles[`num_${c.tone}`]}`}>{c.n}</span>
                  <strong>{c.name}</strong>
                  <span className={`${styles.status} ${styles[`status_${c.tone}`]}`}>{c.status}</span>
                </div>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <SiteHeader />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <svg className={`${styles.scribble} ${styles.scribbleLeft}`} viewBox="0 0 260 60" aria-hidden="true">
            <path d="M2 40c40-6 80-10 118-12 22-1 30 4 24 10-8 8-34 6-30-6 4-12 34-14 62-12 26 2 50 4 82 2" />
          </svg>
          <svg className={`${styles.scribble} ${styles.scribbleRight}`} viewBox="0 0 200 50" aria-hidden="true">
            <path d="M4 14c50 2 110-2 170-4M30 26c40-2 90-4 140-2-30 4-70 8-104 14 36-2 74-2 108 0" />
          </svg>
          <div className={styles.heroInner}>
            <Link href="/signup" className={styles.announce}>
              <span className={styles.announceTag}>New</span>
              Sign in with Google is here
            </Link>
            <h1 className={styles.headline}>Get client approval on your websites, without the back-and-forth.</h1>
            <div className={styles.heroBottom}>
              <p className={styles.subhead}>
                Share a link to any website. Reviewers pin comments exactly where they mean them — no downloads, no
                accounts, no email threads.
              </p>
              <div className={styles.heroActions}>
                <div className={styles.ctaRow}>
                  <Link href="/signup" className="btn btnPrimary btnLg">
                    Start for free
                  </Link>
                  <a href="#how-it-works" className="btn btnSecondary btnLg">
                    See how it works
                  </a>
                </div>
                <p className={styles.ctaHint}>No credit card required. Free forever for small projects.</p>
              </div>
            </div>
          </div>
          <ReviewDemo />
        </section>

        <section className={styles.statement}>
          <div className={styles.statementInner}>
            <h2 className={styles.statementHeading}>Your client opens a link. That&apos;s the whole onboarding.</h2>
            <div>
              <p className={styles.statementText}>
                Every other review tool asks the person you&apos;re billing to create a password first. Easymarker
                doesn&apos;t. Reviewers land, click, type — that&apos;s the only thing we ever ask, and only once.
              </p>
              <dl className={styles.figures}>
                <div>
                  <dt>0</dt>
                  <dd>accounts for reviewers</dd>
                </div>
                <div>
                  <dt>3</dt>
                  <dd>free projects, always</dd>
                </div>
                <div>
                  <dt>1</dt>
                  <dd>link is all it takes</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.section}>
          <h2 className={styles.sectionHeading}>How it works</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className={styles.section}>
          <div className={styles.featuresLayout}>
            <div className={styles.featuresIntro}>
              <h2 className={styles.sectionHeading}>Everything you need to close feedback loops</h2>
              <p className={styles.sectionText}>
                Built for designers, developers and agencies who are tired of screenshots with red arrows on them.
              </p>
              <Link href="/signup" className="btn btnSecondary">
                Create your first project
              </Link>
            </div>
            <ul className={styles.features}>
              {FEATURES.map((feature) => (
                <li key={feature.title} className={styles.feature}>
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureText}>{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {TESTIMONIALS.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>What people are saying</h2>
            <div className={styles.testimonials}>
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className={styles.testimonial}>
                  <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section id="pricing" className={styles.section}>
          <div className={styles.pricingIntro}>
            <h2 className={styles.sectionHeading}>Pay for the people who fix things.</h2>
            <p className={styles.sectionText}>Reviewers are always free and always unlimited.</p>
          </div>
          <div className={styles.pricingGrid}>
            {PLANS.map((plan) => (
              <div key={plan.name} className={`${styles.plan} ${plan.featured ? styles.planFeatured : ""}`}>
                <div className={styles.planTop}>
                  <p className={styles.planName}>{plan.name}</p>
                  {plan.featured && <span className={styles.planBadge}>Most popular</span>}
                </div>
                <p className={styles.planPrice}>
                  {plan.price}
                  <span>/{plan.period}</span>
                </p>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`btn ${plan.featured ? "btnPrimary" : "btnSecondary"}`}
                  style={{ width: "100%" }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <h2 className={styles.finalCtaHeading}>You&apos;re one link away from your next round of feedback.</h2>
          <Link href="/signup" className="btn btnPrimary btnLg">
            Start for free
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
