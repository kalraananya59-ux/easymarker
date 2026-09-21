"use client";

import { signIn } from "next-auth/react";
import styles from "./AuthLayout.module.css";

export function GoogleSignInButton() {
  return (
    <button type="button" className={styles.googleBtn} onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 01-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.96-2.91l-3.88-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.96H1.26v3.1A12 12 0 0012 24z"
        />
        <path fill="#FBBC05" d="M5.26 14.28a7.2 7.2 0 010-4.56v-3.1H1.26a12 12 0 000 10.76l4-3.1z" />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 001.26 6.62l4 3.1C6.21 6.86 8.87 4.75 12 4.75z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
