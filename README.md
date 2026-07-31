# Bloom Health Companion

Build a modern, empathetic, offline-first mobile web application called "NORA" designed as a menstrual health tracker and silent endometriosis screening companion. 

The core UX centers around a dynamic, Pixar-"Inside Out" inspired companion avatar named "Luna" who lives on the dashboard. Luna visually evolves, changes state, and grows alongside the user throughout her monthly cycle calendar to reflect her internal physical and emotional state.

---

### DESIGN SYSTEM & VISUAL STYLE

- Name: Bloom

- Theme: Soft, comforting, premium health UI (rounded corners, subtle gradients, deep glassmorphism, soothing warm ambient lighting).

- Color Palette:

  - Follicular Phase: Soft Sky Blue (#89CFF0)

  - Ovulation Phase: Radiant Warm Gold (#FFD700)

  - Luteal / Endo Belly: Dusty Lavender/Purple (#9370DB)

  - Menstruation / Pain Flare: Deep Ember Coral (#FF6F61)

  - Crisis SOS Mode: Charcoal Black (#121212) with glowing red accents

- Fonts: Sans-serif, rounded, highly legible (e.g., Inter or Nunito).

---

### CORE AVATAR COMPONENT: "LUNA"

Luna is an interactive, animated SVG/Canvas element at the top of the main dashboard. She isn't a static image—she is a glowing, fluid orb/character that changes shape, expression, color, and pulse based on cycle day and logged symptoms:

1. Follicular Phase (Days 6–12):

   - Luna is a calm, tear-drop/dew-drop shape in soft translucent blue with a gentle, slow pulse and a sweet, relaxed expression.

2. Ovulation Phase (Days 13–16):

   - Luna becomes a vibrant, sparkling star shape in glowing warm yellow/gold, with subtle particle sparkles floating around her.

3. Luteal Phase / Endo Belly (Days 17–28):

   - Luna shifts into a soft, slightly irregular purple cloud shape. If the user logs "Bloated/Endo Belly", Luna visually expands slightly and gains a cozy, tired expression.

4. Menstruation Phase (Days 1–5):

   - Luna becomes a warm, protective ember orb in soft coral/red with a soft, flame-like warmth pulse that acts as a comforting presence.

---

### APP NAVIGATION & LAYOUT STRUCTURE

1. Top Navigation Bar:

   - App Name "Bloom" with a subtle flower sprout icon.

   - Circular "Cycle Day" indicator (e.g., "Day 14 • Ovulation").

   - A persistent, prominent high-contrast "SOS Flare" pill button in top right.

2. Main Dashboard (Home Tab):

   - Hero Section: Display "Luna" centered with dynamic ambient background glow matching her state. Below Luna, a gentle greeting: "How are you feeling today, Sarah?"

   - Interactive 3-Second Check-in Slider: A smooth, touch-friendly slider that adjusts Luna's energy/color live as you drag it (Low Energy -> Radiant).

   - Quick Symptom Chips: Tap-to-toggle pills for "Bad Cramps", "Endo Belly", "Radiating Leg Pain", "Heavy Flow", "Nausea". Toggling symptoms immediately changes Luna's texture/expression.

   - WhatsApp Quick Sync Badge: A small banner reading "Connected to WhatsApp • Reply to daily check-ins on WhatsApp anytime."

3. The 3D Symptom Mapper Modal (Triggered by "Detailed Pain Log"):

   - An interactive 3D female anatomical wireframe silhouette.

   - Users can tap specific regions (Lower Pelvis, Back, Thighs, Bowel area) to drop glowing pain points and adjust depth/intensity sliders.

4. SOS Crisis Mode Screen (Triggered by pressing the SOS Button):

   - High-contrast, dark distraction-free interface.

   - Luna transforms into a large, warm glowing ember that pulses at a 4-7-8 rhythm for diaphragmatic breathing guidance.

   - Prominent text: "Caregiver Alert Sent via WhatsApp" with a checkmark.

   - Three quick-check emergency screening buttons: [Fever?], [Unilateral Sharp Pain?], [Heavy Vomiting?].

   - Quick access button: "Guide Me Through 3D Pelvic Relief Poses".

5. Doctor Advocacy Report Screen ("My Health Story"):

   - Summarizes 3 months of logged cycle data into a clean, downloadable 1-page clinical triage summary.

   - Displays calculated "Pain Impact Metrics" (e.g., "Days Missed Work/School: 3", "NSAID Efficacy: Low").

   - Button: "Download Doctor Advocacy PDF".

---

### INTERACTION EXPECTATIONS

- Smooth Framer Motion transitions between screen states.

- Micro-interactions: Tapping Luna makes her react with a soft wobble and a gentle sound effect or pulse.

- Mobile-first responsive layout tailored for low-bandwidth, offline-first operation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ec806cfe-b548-4105-ad78-4f4a03d5e600).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
