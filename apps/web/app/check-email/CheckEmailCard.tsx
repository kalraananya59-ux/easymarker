"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "../AuthLayout.module.css";

export function CheckEmailCard({ email }: { email: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  }

  function checkAgain() {
    setChecking(true);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className={`card ${styles.card}`}>
      <h1 className={styles.heading}>Verify your email</h1>
      <p className={styles.footer}>
        We sent a verification link to <strong>{email}</strong>. Click it, then come back here.
      </p>
      <button type="button" className="btn btnPrimary" onClick={checkAgain} disabled={checking}>
        {checking ? "Checking…" : "I've verified — continue"}
      </button>
      <button type="button" className="btn btnSecondary" onClick={resend} disabled={sending || sent}>
        {sent ? "Email sent!" : sending ? "Sending…" : "Resend verification email"}
      </button>
      <button type="button" className="btn btnGhost" onClick={() => signOut({ callbackUrl: "/signin" })}>
        Sign out
      </button>
    </div>
  );
}
