"use client";

import { useRef, useState } from "react";

type Purpose = "photo" | "id_front" | "id_back" | "selfie";

export default function ImageUploader({
  currentUrl,
  purpose,
  userId,
  label,
  shape,
  onUploaded,
}: {
  currentUrl: string | null;
  purpose: Purpose;
  userId: string;
  label: string;
  shape: "circle" | "card";
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      // Optimistic preview using a blob URL.
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      const form = new FormData();
      form.append("file", file);
      form.append("purpose", purpose);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "Upload failed");
        setPreview(currentUrl);
        return;
      }
      const url: string = uploadData.url;

      // Persist the URL on the profile in the right field.
      const fieldMap: Record<Purpose, string> = {
        photo: "photoUrl",
        id_front: "idFrontUrl",
        id_back: "idBackUrl",
        selfie: "selfieUrl",
      };
      const patchRes = await fetch(`/api/taskers/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldMap[purpose]]: url }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        setError(data.error ?? "Could not save");
        return;
      }
      setPreview(url);
      onUploaded(url);
    } finally {
      setBusy(false);
    }
  }

  function onPick() {
    inputRef.current?.click();
  }

  const dims =
    shape === "circle"
      ? "h-24 w-24 rounded-full"
      : "h-32 w-full max-w-xs rounded-md";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden bg-gray-100 ring-1 ring-inset ring-gray-200 ${dims}`}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-gray-400">No file</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="btn-secondary"
        >
          {busy ? "Uploading…" : preview ? "Replace" : label}
        </button>
        <p className="text-xs text-gray-500">JPEG, PNG, or WebP. Max 5 MB.</p>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          // reset so the same file can be re-picked after an error
          e.target.value = "";
        }}
      />
    </div>
  );
}
