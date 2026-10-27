import Link from "next/link";
import { Logo } from "../Logo";
import { SignOutButton } from "./SignOutButton";
import styles from "./AppHeader.module.css";

export function AppHeader({ title, description }: { title: string; description?: string }) {
  const onSettings = title === "Settings";

  return (
    <>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link href="/dashboard" className={styles.logo} aria-label="Easymarker dashboard">
            <Logo size={20} />
          </Link>
          <nav className={styles.nav} aria-label="App">
            <Link
              href="/dashboard"
              className={`${styles.navLink} ${!onSettings ? styles.navLinkActive : ""}`}
              aria-current={!onSettings ? "page" : undefined}
            >
              Projects
            </Link>
            <Link
              href="/dashboard/settings"
              className={`${styles.navLink} ${onSettings ? styles.navLinkActive : ""}`}
              aria-current={onSettings ? "page" : undefined}
            >
              Settings
            </Link>
          </nav>
          <div className={styles.right}>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className={styles.pageHead}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </>
  );
}
