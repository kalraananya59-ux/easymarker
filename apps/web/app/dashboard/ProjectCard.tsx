"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
  id: string;
  title: string;
  type: string;
  status: string;
  shareToken: string;
  createdAt: string;
}

export function ProjectCard({ id, title, type, status, shareToken, createdAt }: ProjectCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${shareToken}` : `/r/${shareToken}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function archive() {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    router.refresh();
  }

  return (
    <div>
      <h3>{title}</h3>
      <p>
        {type} · {status} · {new Date(createdAt).toLocaleDateString()}
      </p>
      <code>{shareUrl}</code>
      <button type="button" onClick={copyLink}>
        {copied ? "Copied!" : "Copy link"}
      </button>
      {status === "active" && (
        <button type="button" onClick={archive}>
          Archive
        </button>
      )}
      <a href={`/api/projects/${id}/export?format=csv`}>Export CSV</a>
      <a href={`/api/projects/${id}/export?format=pdf`}>Export PDF</a>
    </div>
  );
}
