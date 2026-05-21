"use client";

import { useRef, useState } from "react";

const MAX = 6;

type ImageItem =
  | { id: string; status: "uploading"; previewUrl: string }
  | { id: string; status: "done"; previewUrl: string; url: string }
  | { id: string; status: "error"; previewUrl: string; error: string };

export default function TaskImagesUploader({
  onChange,
}: {
  onChange: (urls: string[]) => void;
}) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function emitUrls(next: ImageItem[]) {
    onChange(
      next
        .filter((i): i is Extract<ImageItem, { status: "done" }> =>
          i.status === "done",
        )
        .map((i) => i.url),
    );
  }

  function setItem(id: string, patch: Partial<ImageItem>) {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === id ? ({ ...i, ...patch } as ImageItem) : i,
      );
      emitUrls(next);
      return next;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      emitUrls(next);
      return next;
    });
  }

  async function addFiles(files: File[]) {
    const room = MAX - items.length;
    const accepted = files.slice(0, room);
    if (accepted.length === 0) return;

    // Optimistically render previews via blob URLs.
    const newItems: ImageItem[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      status: "uploading",
      previewUrl: URL.createObjectURL(f),
    }));
    setItems((prev) => [...prev, ...newItems]);

    await Promise.all(
      accepted.map(async (file, idx) => {
        const id = newItems[idx].id;
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("purpose", "task");
          const res = await fetch("/api/uploads", {
            method: "POST",
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setItem(id, {
              status: "error",
              error: data.error ?? "Upload failed",
            });
            return;
          }
          setItem(id, { status: "done", url: data.url });
        } catch {
          setItem(id, { status: "error", error: "Network error" });
        }
      }),
    );
  }

  const remaining = MAX - items.length;

  return (
    <div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="relative aspect-square overflow-hidden rounded-md ring-1 ring-inset ring-gray-200"
          >
            <img
              src={item.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {item.status === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                Uploading…
              </div>
            ) : null}
            {item.status === "error" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-red-600/80 p-2 text-center text-[11px] font-medium text-white">
                {item.error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label="Remove image"
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-white"
            >
              ×
            </button>
          </li>
        ))}

        {remaining > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Add photo
            </button>
          </li>
        ) : null}
      </ul>

      <p className="mt-2 text-xs text-gray-500">
        Up to {MAX} photos. JPEG, PNG, or WebP. Max 5 MB each.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) addFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function hasUnfinishedUploads(urls: string[], items: number): boolean {
  // Helper for callers; we expose count vs urls so callers can disable submit.
  return items > urls.length;
}
