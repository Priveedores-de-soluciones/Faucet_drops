// hooks/use-visit-tracker.ts
// Drop this file into your hooks/ folder and call useVisitTracker() in your
// root layout or _app.tsx.  It fires once per client-side navigation.

"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API_BASE_URL = "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

/** Lightweight browser fingerprint — not for auth, just to deduplicate visitors. */
function getFingerprint(): string {
    try {
        const raw = [
            navigator.language,
            navigator.platform,
            screen.width,
            screen.height,
            screen.colorDepth,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        ].join("|");
        // Simple djb2 hash → 8-char hex
        let h = 5381;
        for (let i = 0; i < raw.length; i++) {
            h = ((h << 5) + h) ^ raw.charCodeAt(i);
            h = h >>> 0;
        }
        return h.toString(16).padStart(8, "0");
    } catch {
        return "unknown";
    }
}

export function useVisitTracker() {
    const pathname = usePathname();

    useEffect(() => {
        // Don't track admin/internal paths
        if (pathname?.startsWith("/admin") || pathname?.startsWith("/_")) return;

        const payload = {
            path:        pathname ?? "/",
            referrer:    typeof document !== "undefined" ? document.referrer || null : null,
            user_agent:  typeof navigator !== "undefined" ? navigator.userAgent : null,
            fingerprint: getFingerprint(),
        };

        // Fire-and-forget — never blocks navigation
        fetch(`${API_BASE_URL}/api/track-visit`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload),
            // Use keepalive so the request survives page unloads
            keepalive: true,
        }).catch(() => { /* silently ignore */ });
    }, [pathname]);  // re-fires on every client-side route change
}