"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UpgradeButton } from "./UpgradeButton";
import styles from "./NewProjectForm.module.css";

export function NewProjectForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLimitReached(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Try again.");
        setLimitReached(data.error?.code === "PLAN_LIMIT_REACHED");
        return;
      }

      setUrl("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        className={`input ${styles.input}`}
      />
      <button type="submit" disabled={submitting} className="btn btnPrimary">
        {submitting ? "Adding…" : "Create project"}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
          {limitReached && <UpgradeButton plan="pro" label="Upgrade to Pro" />}
        </p>
      )}
    </form>
  );
}
