"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UpgradeButton } from "./UpgradeButton";
import styles from "./UploadForm.module.css";

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);

  function upload(file: File) {
    setError(null);
    setErrorCode(null);
    setFailedFile(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        router.refresh();
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        setError(data.error?.message ?? "Upload failed. Try again.");
        if (data.error?.code === "PLAN_LIMIT_REACHED") {
          setErrorCode("PLAN_LIMIT_REACHED");
        } else {
          setFailedFile(file);
        }
      } catch {
        setError("Upload failed. Try again.");
        setFailedFile(file);
      }
    };

    xhr.onerror = () => {
      setProgress(null);
      setFailedFile(file);
      setError("Upload was interrupted. Check your connection and try again.");
    };

    xhr.send(formData);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""}`}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <svg className={styles.icon} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7 9m5-5l5 5M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {progress !== null ? (
          <>
            <p className={styles.hint}>Uploading… {progress}%</p>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <p className={styles.hint}>Drag and drop, or click to browse</p>
            <p className={styles.hintMuted}>PNG, JPG, WebP, GIF, or PDF — up to 50 MB</p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
          {errorCode === "PLAN_LIMIT_REACHED" && (
            <span onClick={(e) => e.stopPropagation()}>
              <UpgradeButton plan="pro" label="Upgrade to Pro" />
            </span>
          )}
          {failedFile && (
            <button
              type="button"
              className="btn btnSecondary btnSm"
              onClick={(e) => {
                e.stopPropagation();
                upload(failedFile);
              }}
            >
              Retry
            </button>
          )}
        </p>
      )}
    </div>
  );
}
