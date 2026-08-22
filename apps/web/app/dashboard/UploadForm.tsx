"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upload(file: File) {
    setError(null);
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
      } catch {
        setError("Upload failed. Try again.");
      }
    };

    xhr.onerror = () => {
      setProgress(null);
      setError("Upload failed. Check your connection and try again.");
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      data-dragover={dragOver}
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
      {progress !== null ? (
        <p>Uploading… {progress}%</p>
      ) : (
        <p>Drag and drop an image or PDF here, or click to browse. Max 50 MB.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
