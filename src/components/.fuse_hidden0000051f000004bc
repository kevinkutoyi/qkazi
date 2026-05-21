"use client";

import { useEffect, useRef } from "react";

/**
 * Reads the browser's reported IANA timezone and silently POSTs it to the
 * server when it differs from what we already have stored. Mount once in
 * the layout for authenticated users. Renders nothing.
 *
 * If the user manually changes their timezone via /settings, the next
 * render passes a new `current` prop and this component does nothing.
 */
export default function TimezoneSync({ current }: { current: string | null }) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!browser) return;
      if (browser === current) return;
      // Fire-and-forget; failure isn't worth surfacing.
      fetch("/api/users/me/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: browser }),
      }).catch(() => undefined);
    } catch {
      // No Intl support, or running in a weird sandbox. Skip silently.
    }
  }, [current]);
  return null;
}
