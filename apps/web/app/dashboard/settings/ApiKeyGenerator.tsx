"use client";

import { useState } from "react";

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
    <div>
      <h2>API key</h2>
      <p>Generating a new key immediately invalidates any previous key for this workspace.</p>
      <button type="button" onClick={generate} disabled={generating}>
        {generating ? "Generating…" : "Generate new API key"}
      </button>
      {apiKey && (
        <div>
          <p>Copy this now — it won&apos;t be shown again:</p>
          <code>{apiKey}</code>
        </div>
      )}
    </div>
  );
}
