import Link from "next/link";
import styles from "./not-found.module.css";

export default function ReviewLinkNotFound() {
  return (
    <div className={styles.page}>
      <div className={`card ${styles.card}`}>
        <h1 className={styles.heading}>This review link isn&apos;t available</h1>
        <p className={styles.text}>
          It may have been deactivated, or the link may be incorrect. Check with whoever shared it, or head back
          to Easymarker.
        </p>
        <Link href="/" className="btn btnPrimary">
          Go to Easymarker
        </Link>
      </div>
    </div>
  );
}
