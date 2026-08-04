# NORA — Production Readiness Audit

> **Audit Date:** August 4, 2026  
> **Branch Audited:** `main`  
> **Overall Verdict: 🟡 Strong Prototype / MVP — Not Yet Production-Ready**

NORA is a polished, feature-rich prototype with excellent UX design and thoughtful architecture. However, it has significant gaps across testing, security hardening, data durability, accessibility, and deployment readiness that would need to be addressed before serving real users — especially given that it handles **sensitive health data**.

---

## Scorecard

| Area | Score | Notes |
|---|:---:|---|
| **UI/UX & Design** | 🟢 9/10 | Beautiful, empathetic, well-themed, animated |
| **Architecture** | 🟢 8/10 | Clean separation, file-based routing, proxy pattern |
| **Feature Completeness** | 🟢 8/10 | Core flow works end-to-end |
| **Error Handling** | 🟡 6/10 | SSR errors covered; client errors partially |
| **Security** | 🔴 4/10 | CSRF present, but critical gaps remain |
| **Testing** | 🔴 1/10 | Zero tests of any kind |
| **Data Durability** | 🔴 3/10 | localStorage only — wipe on clear browser data |
| **Accessibility** | 🟡 5/10 | Some ARIA, but major gaps |
| **Performance** | 🟡 6/10 | Good streaming, but no lazy loading or code splitting |
| **Deployment** | 🟡 5/10 | Cloudflare target configured, but Ollama dependency is a blocker |
| **Documentation** | 🟢 8/10 | Solid README, architecture diagrams |

---

## 🔴 Critical Issues (Must Fix Before Production)

### 1. Zero Test Coverage

- **No unit tests, integration tests, or E2E tests exist** — not even a test runner is configured.
- No `vitest`, `jest`, `playwright`, or `cypress` in `package.json`.
- For a health-related app, this is a serious liability — cycle calculations, endo risk evaluation, and the report generator all need automated verification.

**Files at risk without tests:**
- `src/lib/cycle.ts` — cycle day calculation, phase detection
- `src/lib/forecast.ts` — endo risk evaluation, month log management
- `src/store/nora.tsx` — state normalization, onboarding completeness checks

---

### 2. Data Storage is `localStorage` Only

All user data (cycle info, symptoms, pain points, chat history, month logs, onboarding profile) lives in `localStorage`:

```typescript
// src/store/nora.tsx line 207
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

// src/lib/gemma.ts line 18
localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
```

**Risks:**
- Users lose **ALL** data if they clear browser storage, switch browsers, or use incognito.
- No export/import mechanism (the "Download PDF" button is a toast-only stub).
- `localStorage` has a ~5MB limit — months of chat history + pain logs could hit it.
- No encryption — anyone with physical device access can read raw health data.

---

### 3. Server Proxy is an Open Relay

`src/server.ts` (lines 94–121) blindly forwards any POST body to `Ollama /api/chat`:

- **No authentication**
- **No rate limiting**
- **No input validation** beyond JSON model fallback
- A malicious client can send arbitrary prompts, system prompts, or model overrides

The proxy is currently CSRF-protected only for TanStack server functions (via `src/start.ts`), but the raw `/api/chat` and `/api/ollama-status` routes in `server.ts` **bypass this entirely** since they return early before reaching the TanStack handler.

---

### 4. No Content Security Policy or Security Headers

- No `Content-Security-Policy`
- No `X-Frame-Options`
- No `X-Content-Type-Options`
- No `Strict-Transport-Security`
- No `Permissions-Policy` headers

The app loads Google Fonts from an external CDN — without CSP this is an XSS surface.

---

### 5. Health Disclaimers & Legal

There's a small disclaimer on the report page ("NORA is not a diagnostic device"), but:

- **No Terms of Service**
- **No Privacy Policy** (critical for health data, even if offline-first)
- **No HIPAA/GDPR considerations** documented
- The SOS screen provides medical screening guidance ("If these worsen, seek urgent care") without proper medical review disclaimers at every touchpoint

---

## 🟡 Important Issues (Should Fix)

### 6. Accessibility Gaps

- **No skip navigation** links
- The Luna SVG canvas (`src/components/Luna.tsx`) has drag-to-set-energy with no keyboard alternative
- SOS breathing animation has no `prefers-reduced-motion` respect — the entire screen pulses and scales
- Symptom chip buttons lack `role="checkbox"` or proper `aria-pressed` (though onboarding chips do have `aria-pressed`)
- No focus management when modals open/close (PainMapper, SosScreen, PoseGuideCamera)
- Color contrast in phase-gradient text on light backgrounds may be insufficient

---

### 7. No PWA / Service Worker

- The README claims "offline-first" but there's **no service worker** and **no `manifest.json`**
- The app will fail entirely offline — it can't even cache the shell
- No install prompt for "Add to Home Screen"

---

### 8. Ollama Dependency = Can't Deploy to Cloud

The entire AI feature (chat, report analysis) requires a **local Ollama instance**:

- The Vite config targets Cloudflare (`@lovable.dev/vite-tanstack-config` uses Cloudflare by default), but Cloudflare Workers/Pages can't run Ollama.
- For real deployment you'd need either:
  - A managed LLM API (Gemini API, OpenAI, etc.)
  - A self-hosted GPU server running Ollama
  - WebGPU in-browser inference (there's a `webgpu-llm.ts` file — possibly WIP)

---

### 9. WhatsApp / SMS Integration is Client-Side Only

- `src/lib/dispatch.ts` builds `whatsapp://` and `sms:` URLs
- No actual message is sent — it just opens the native app with a pre-filled message
- The daily check-in toggle ("Send me 8:00 PM daily check-in messages on WhatsApp") has **no backend** — it's a UI toggle that does nothing

---

### 10. The Report PDF Download is a Stub

```typescript
// src/routes/report.tsx lines 200-201
onClick={() => toast.success("Doctor Advocacy PDF prepared for download")}
```

Just shows a toast — no actual PDF generation.

---

### 11. No Input Sanitization on Chat

- User messages are passed directly into the LLM system prompt context
- While this is a local LLM, prompt injection could make the model produce harmful health advice
- The `renderMarkdown()` function in `src/components/GemmaChat.tsx` does minimal parsing (bold/italic) — if the model outputs HTML, it could inject content (though React escapes by default)

---

## 🟢 What's Done Well

### Architecture
- Clean separation: routes ↔ components ↔ lib ↔ store
- TanStack Start with file-based routing and SSR
- Server proxy pattern is clean and simple
- CSRF middleware is configured for server functions

### Error Handling
- `src/lib/error-capture.ts`: sophisticated error capture that wraps `console.error`, captures cause chains, and intercepts h3's swallowed 500s
- `src/server.ts`: graceful HTML error page fallback for SSR crashes
- Root error boundary with retry + go home options
- Ollama connection status polling with graceful degradation UI

### UX / Design
- Phase-aware theming (colors, gradients, glow effects change by cycle phase)
- Inside Out avatar system with emotional depth
- Smooth Framer Motion animations throughout
- Voice-first SOS triage with speech synthesis + speech recognition
- 4-7-8 breathing exercise with visual feedback
- Streaming chat with token-by-token display
- Onboarding persistence across refreshes (eager localStorage write)

### State Management
- `NoraProvider` (`src/store/nora.tsx`) is well-structured with:
  - Version-migrated storage keys
  - Normalized state on hydration
  - Endo risk evaluation on every relevant state change
  - Separate `hydrated` flag to prevent premature writes

---

## Recommended Prioritized Action Plan

### P0 — Must Fix (Before Any Public Release)

| Action | Effort | Details |
|---|---|---|
| Add test framework + core tests | 2–3 days | Install Vitest; cover `cycle.ts`, `forecast.ts`, nora store |
| Rate limit + validate `/api/chat` proxy | 1 day | Add per-IP rate limiting, payload size cap, model whitelist |
| Add security headers | 0.5 day | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Privacy policy + medical disclaimers | 1 day | Legal pages + disclaimers at all health advice touchpoints |

### P1 — Important (Before Wider Rollout)

| Action | Effort | Details |
|---|---|---|
| Service worker + web manifest | 2 days | True offline caching, PWA install prompt |
| Data export/import | 1–2 days | JSON backup/restore or encrypted file download |
| Implement PDF generation | 1 day | Use `jsPDF` or `@react-pdf/renderer` for doctor report |
| `prefers-reduced-motion` support | 0.5 day | Disable or reduce all animations for motion-sensitive users |
| Cloud LLM fallback | 2–3 days | Gemini API or similar for non-local deployment |

### P2 — Should Fix (Polish)

| Action | Effort | Details |
|---|---|---|
| E2E tests | 2–3 days | Playwright for onboarding + SOS flow |
| Encrypt localStorage health data | 1–2 days | AES encryption at rest for sensitive records |
| Focus management + keyboard nav | 1 day | Modal focus trapping, keyboard alternatives for Luna |
| WhatsApp Business API integration | 3–5 days | Actual daily check-in messages via backend |

### P3 — Nice to Have

| Action | Effort | Details |
|---|---|---|
| Error monitoring (Sentry) | 0.5 day | Catch production errors proactively |
| Privacy-respecting analytics | 0.5 day | Plausible or similar for usage insights |
| Performance audit + code splitting | 1 day | Lazy-load routes, optimize bundle size |

---

## Summary

> **NORA is a genuinely impressive prototype** — the UX is empathetic and beautiful, the architecture is clean, and the feature set is ambitious. The biggest risks for production are:
>
> 1. **Data loss** — `localStorage` only, no backups
> 2. **Medical liability** — insufficient disclaimers and legal coverage
> 3. **Security** — open proxy, no security headers
> 4. **Zero tests** — no safety net for health-critical calculations
> 5. **Ollama dependency** — blocks cloud deployment
>
> Addressing the P0 items (~5 days of work) would bring NORA to a shippable MVP state. The P1 items (~7 days) would make it a solid product ready for wider adoption.
