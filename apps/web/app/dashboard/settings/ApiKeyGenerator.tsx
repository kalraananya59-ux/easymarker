"use client";

import { useState } from "react";
import pageStyles from "./page.module.css";
import styles from "./ApiKeyGenerator.module.css";

export function ApiKeyGenerator() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/settings/api-key", { method: "POST" });
      const data = await res.json();
      if (res.ok) setApiKey(data.apiKey);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className={`card ${pageStyles.section}`}>
      <h2 className={pageStyles.sectionHeading}>API key</h2>
      <p className={pageStyles.sectionDescription}>
        Generating a new key immediately invalidates any previous key for this workspace.
      </p>
      <button type="button" className="btn btnSecondary" onClick={generate} disabled={generating}>
        {generating ? "Generating…" : "Generate new API key"}
      </button>
      {apiKey && (
        <div className={styles.keyBox}>
          <p>Copy this now — it won&apos;t be shown again:</p>
          <code className={styles.key}>{apiKey}</code>
        </div>
      )}
    </section>
  );
}
