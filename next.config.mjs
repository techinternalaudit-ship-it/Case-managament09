/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Next's App Router injects inline bootstrap scripts and Tailwind emits inline
// styles, so script-src/style-src have to permit 'unsafe-inline'. Everything
// else is locked to same-origin: no external scripts, frames, or form targets.
//
// 'unsafe-eval' is required by the dev server only — its HMR runtime evaluates
// module code as strings. Production bundles contain no eval, so it is omitted
// there and blocking eval stays a real defence against injected script.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Dev needs the HMR websocket; production only ever talks to its own origin.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Takes effect only over HTTPS; harmless while the app is still on HTTP.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Case data must never be cached by an intermediate proxy.
  { key: "Cache-Control", value: "no-store, max-age=0" },
];

const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
