"use client";

import { useState } from "react";
import { UpgradeButton } from "../UpgradeButton";
import type { Plan } from "@easymarker/shared";
import pageStyles from "./page.module.css";
import styles from "./BillingSection.module.css";

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
};

const PLAN_BADGE_CLASS: Record<Plan, string> = {
  free: "badgeFree",
  pro: "badgePro",
  agency: "badgeAgency",
};

export function BillingSection({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error?.message ?? "Couldn't open the billing portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`card ${pageStyles.section}`}>
      <h2 className={pageStyles.sectionHeading}>Billing</h2>

      <div className={styles.planRow}>
        <span className={`badge ${PLAN_BADGE_CLASS[plan]}`}>{PLAN_LABELS[plan]} plan</span>
      </div>

      <div className={styles.actions}>
        {plan === "free" && (
          <>
            <UpgradeButton plan="pro" label="Upgrade to Pro — $19/mo" />
            <UpgradeButton plan="agency" label="Upgrade to Agency — $49/mo" />
          </>
        )}

        {plan !== "free" && (
          <button type="button" className="btn btnSecondary" onClick={openPortal} disabled={loading}>
            {loading ? "Opening…" : "Manage billing"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
