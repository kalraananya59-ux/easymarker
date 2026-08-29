import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AuthLayout.module.css";

export function AuthLayout({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.logo}>
        Easymarker
      </Link>
      <div className={`card ${styles.card}`}>
        <h1 className={styles.heading}>{heading}</h1>
        {children}
      </div>
    </div>
  );
}
