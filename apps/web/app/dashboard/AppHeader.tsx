import Link from "next/link";
import { Logo } from "../Logo";
import { SignOutButton } from "./SignOutButton";
import styles from "./AppHeader.module.css";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/dashboard" className={styles.logo}>
          <Logo size={20} />
        </Link>
        <span className={styles.divider} aria-hidden="true" />
        <h1 className={styles.title}>{title}</h1>
      </div>
      <nav className={styles.nav}>
        <Link href="/dashboard/settings" className={styles.navLink}>
          Settings
        </Link>
        <SignOutButton />
      </nav>
    </header>
  );
}
