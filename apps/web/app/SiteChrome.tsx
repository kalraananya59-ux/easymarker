import Link from "next/link";
import { Logo, LogoMark } from "./Logo";
import styles from "./SiteChrome.module.css";

// Shared header/footer for the public pages (home, blog). The app screens
// use dashboard/AppHeader instead.
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Easymarker home">
          <Logo />
        </Link>
        <nav className={styles.links} aria-label="Main">
          <Link href="/#features" className={styles.link}>
            Features
          </Link>
          <Link href="/#pricing" className={styles.link}>
            Pricing
          </Link>
          <Link href="/blog" className={styles.link}>
            Blog
          </Link>
        </nav>
        <div className={styles.actions}>
          <Link href="/signin" className="btn btnGhost btnSm">
            Log in
          </Link>
          <Link href="/signup" className="btn btnPrimary btnSm">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <LogoMark size={20} />
          <p>Website feedback, pinned where it belongs.</p>
        </div>
        <nav className={styles.footerLinks} aria-label="Footer">
          <Link href="/#features">Features</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/signin">Log in</Link>
          <Link href="/signup">Start free</Link>
        </nav>
      </div>
      <p className={styles.copyright}>© {new Date().getFullYear()} Easymarker</p>
    </footer>
  );
}
