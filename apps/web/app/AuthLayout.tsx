import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import styles from "./AuthLayout.module.css";

export function AuthLayout({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.split}>
      <div className={styles.formSide}>
        <Link href="/" className={styles.logo}>
          <Logo />
        </Link>
        <div className={styles.formWrap}>
          <h1 className={styles.heading}>{heading}</h1>
          {subheading && <p className={styles.subheading}>{subheading}</p>}
          <div className={styles.body}>{children}</div>
        </div>
        <p className={styles.legal}>© {new Date().getFullYear()} Easymarker</p>
      </div>

      <aside className={styles.showcase} aria-hidden="true">
        <div className={styles.showcaseGlow} />
        <div className={styles.showcaseInner}>
          <div className={styles.miniSite}>
            <span className={styles.miniBar} />
            <span className={styles.miniTitle} />
            <span className={styles.miniLine} />
            <span className={styles.miniLine} style={{ width: "52%" }} />
            <span className={styles.miniButton} />
            <span className={`${styles.miniPin} ${styles.miniPinA}`}>1</span>
            <span className={`${styles.miniPin} ${styles.miniPinB}`}>2</span>
            <div className={styles.miniComment}>
              <strong>Sam</strong>
              <span>Can we make this button bigger?</span>
            </div>
          </div>
          <p className={styles.showcaseQuote}>Feedback, pinned exactly where your client meant it.</p>
          <p className={styles.showcaseText}>No screenshots with arrows. No reviewer accounts. Just a link.</p>
        </div>
      </aside>
    </div>
  );
}
