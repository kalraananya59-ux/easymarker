"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../AuthLayout";
import styles from "../AuthLayout.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Try again.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/signin"), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout heading="Invalid link">
        <p className={styles.footer} style={{ margin: 0 }}>
          This password reset link is missing or invalid.{" "}
          <Link href="/forgot-password">Request a new one</Link>.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout heading="Password reset">
        <p className={styles.footer} style={{ margin: 0 }}>
          Your password has been changed. Redirecting you to sign in…
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout heading="Choose a new password">
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="password"
          placeholder="New password (min. 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="input"
        />
        <button type="submit" disabled={submitting} className="btn btnPrimary">
          {submitting ? "Resetting…" : "Reset password"}
        </button>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
