# NORA — Cycle Companion

An empathetic, offline-first mobile web application designed as a menstrual health tracker and silent endometriosis screening companion.

The core UX centers around a dynamic, Pixar-*Inside Out* inspired companion avatar named **Luna** who lives on the dashboard. Luna visually evolves, changes state, and grows alongside the user throughout her monthly cycle calendar to reflect her internal physical and emotional state.

---

## Features

### 🌙 Luna — Your Living Companion

Luna is an interactive, animated element at the top of the main dashboard. She changes shape, expression, color, and pulse based on cycle day and logged symptoms:

| Phase | Days | Luna's Form |
|---|---|---|
| **Follicular** | 6–12 | Calm tear-drop in translucent blue with a gentle pulse |
| **Ovulation** | 13–16 | Vibrant sparkling star in warm gold with particle sparkles |
| **Luteal / Endo Belly** | 17–28 | Soft purple cloud; expands if "Bloated" is logged |
| **Menstruation** | 1–5 | Warm protective ember orb in coral with a comforting warmth pulse |

### 🩺 Doctor Advocacy Report ("My Health Story")

A one-page clinical triage summary built from your logs — written in the language clinicians use, so you're heard the first time. Metrics, cycle-by-cycle timeline, and a screening signal are **dynamically generated** by the local LLM from your chat history and symptom data.

### 🧠 Local AI Chat (Luna)

Chat with Luna, powered by a local [Ollama](https://ollama.com) instance running `batiai/gemma4-e2b:q4`. All conversations stay on your device — nothing is sent to the cloud.

- **NDJSON streaming** delivers character-by-character responses for a snappy, real-time typing feel.
- Luna's persona is tuned for short, empathetic replies unless detailed health analysis is requested.
- Chat history is persisted in `localStorage` and fed into the clinical report generator.

### 🚨 SOS Flare

A high-contrast crisis mode with guided 4-7-8 breathing, caregiver alert simulation, and emergency screening buttons.

### 📷 3D Pose Guide Camera

AR-style guided pelvic relief poses using the device camera with real-time pose detection.

### 🎭 Inside Out Avatars

Emotion-based avatars (Anger, Anxiety, Sadness, etc.) that reflect your current emotional state.

---

## Design System

- **Theme**: Soft, comforting, premium health UI — rounded corners, subtle gradients, deep glassmorphism, soothing warm ambient lighting.
- **Color Palette**:
  - Follicular Phase: Soft Sky Blue (`#89CFF0`)
  - Ovulation Phase: Radiant Warm Gold (`#FFD700`)
  - Luteal / Endo Belly: Dusty Lavender (`#9370DB`)
  - Menstruation / Pain Flare: Deep Ember Coral (`#FF6F61`)
  - Crisis SOS Mode: Charcoal Black (`#121212`) with glowing red accents
- **Font**: [Nunito](https://fonts.google.com/specimen/Nunito)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR + file-based routing) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS + custom CSS variables for phase theming |
| State | React Context (`NoraProvider`) with `localStorage` persistence |
| AI / LLM | [Ollama](https://ollama.com) running `batiai/gemma4-e2b:q4` locally |
| Build | Vite + Nitro |
| Icons | [Lucide React](https://lucide.dev) |

---

## Architecture

```
Browser (React)
  │
  ├─ GemmaChat.tsx ──► streamGemmaChat() ──► fetch("/api/chat")
  │                                              │
  ├─ report.tsx ────► analyzeHealthData() ───► fetch("/api/chat")
  │                                              │
  └─ useOllamaStatus() ─────────────────► fetch("/api/ollama-status")
                                                 │
                                          src/server.ts (raw proxy)
                                                 │
                                          Ollama @ localhost:11434
```

The server proxy in `src/server.ts` intercepts `/api/chat` and `/api/ollama-status` requests and forwards them directly to the local Ollama instance. For streaming chat, the raw NDJSON response body is piped through untouched — no buffering, no parsing — giving the UI instant token-by-token delivery.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (install via [nvm](https://github.com/nvm-sh/nvm))
- [Ollama](https://ollama.com) installed and running locally
- The `batiai/gemma4-e2b:q4` model pulled:
  ```sh
  ollama pull batiai/gemma4-e2b:q4
  ```

## Getting Started

```sh
git clone https://github.com/Nosh-thee-techy/NORA.git
cd NORA
npm install
npm run dev
```

The app will start at `http://localhost:3000`. Ensure Ollama is running (`ollama serve`) for the AI features to work.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Base URL for the Ollama API |
| `GEMMA_MODEL` | `batiai/gemma4-e2b:q4` | Model name to use for chat and analysis |

---

## Project Structure

```
src/
├── components/       # UI components (Luna, GemmaChat, TopNav, SosScreen, etc.)
├── hooks/            # Custom hooks (useOllamaStatus)
├── lib/              # Utilities (gemma.ts, cycle.ts, ollama.ts, avatars.ts)
├── routes/           # TanStack file-based routes (index, chat, report, onboarding)
│   └── api/          # Server function routes
├── store/            # React Context state (NoraProvider)
├── server.ts         # Server entry with Ollama proxy
├── router.tsx        # TanStack router setup
└── styles.css        # Global styles with phase-aware CSS variables
```

---

## License

This project is open source. See [LICENSE](LICENSE) for details.
