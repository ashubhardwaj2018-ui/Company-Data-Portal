// Central API configuration.
//
// In development (Replit / local) VITE_API_BASE_URL is unset, so all "/api/..."
// requests stay relative and hit the same origin — unchanged behavior.
//
// In production builds (npm run build) the base defaults to the VPS backend
// https://api.addressbay.com, so every "/api/..." request is sent there with
// credentials included (cookies). Override with VITE_API_BASE_URL if needed.
//
// This module patches window.fetch once (imported first in main.tsx) so that
// every existing call site — fetch("/api/..."), fetch(url), TanStack Query,
// apiRequest — is covered without rewriting each one.

const PROD_DEFAULT_API_BASE = "https://api.addressbay.com";

export const API_BASE: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.PROD ? PROD_DEFAULT_API_BASE : "")
).replace(/\/+$/, "");

/** Resolve an app API path against the configured backend base URL. */
export function apiUrl(path: string): string {
  return API_BASE && path.startsWith("/api") ? API_BASE + path : path;
}

if (API_BASE && typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      // Cross-origin API call: rewrite to the backend host and send cookies.
      return originalFetch(API_BASE + input, {
        credentials: "include",
        ...init,
      });
    }
    return originalFetch(input, init);
  };
}
