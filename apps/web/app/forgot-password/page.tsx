"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import styles from "../AuthLayout.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout heading="Check your email">
        <p className={styles.footer} style={{ margin: 0 }}>
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your
          password. It expires in 1 hour.
        </p>
        <p className={styles.footer}>
          <Link href="/signin">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout heading="Reset your password">
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
        <button type="submit" disabled={submitting} className="btn btnPrimary">
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className={styles.footer}>
        <Link href="/signin">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
