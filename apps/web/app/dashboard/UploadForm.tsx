import styles from "./UploadForm.module.css";

export function UploadForm() {
  return (
    <div className={`${styles.dropzone} ${styles.dropzoneDisabled}`}>
      <svg className={styles.icon} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 16V4m0 0L7 9m5-5l5 5M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="badge">Coming soon</span>
      <p className={styles.hint}>Image and PDF uploads aren&apos;t available yet</p>
      <p className={styles.hintMuted}>In the meantime, use &ldquo;Review a website&rdquo; above</p>
    </div>
  );
}
