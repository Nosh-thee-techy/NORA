# NORA — Endometriosis Tracking Variables Documentation

> **Version**: v4 (August 2026)
> **Scope**: Real-world, clinically-backed endometriosis screening variables integrated into NORA's tracking engine, AI model analysis, and user-facing UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Clinical Basis](#clinical-basis)
3. [Architecture](#architecture)
4. [Tracked Variables](#tracked-variables)
5. [Composite Risk Scoring](#composite-risk-scoring)
6. [Cyclical Pattern Detection](#cyclical-pattern-detection)
7. [AI Model Integration](#ai-model-integration)
8. [Data Flow](#data-flow)
9. [Storage & Migration](#storage--migration)
10. [UI Changes](#ui-changes)
11. [Files Changed](#files-changed)
12. [Disclaimer](#disclaimer)

---

## Overview

NORA now tracks **25+ clinically-backed endometriosis variables** daily, computes a **composite screening risk score** (0–100), detects **cyclical pain patterns** across menstrual phases, and feeds all of this structured data to the AI model for deeper pattern analysis and clinical triage report generation.

Previously, NORA tracked only 5 quick symptoms and a single peak pain number per month. The new system captures granular pain types, GI/urinary involvement, medication response, functional impact, mood, and fatigue — mirroring what real-world endometriosis research studies and clinical registries use.

---

## Clinical Basis

The tracking variables are informed by validated clinical instruments:

| Instrument | What It Informs |
|---|---|
| **EHP-30 / EHP-5** (Endometriosis Health Profile) | Quality of life dimensions, symptom impact |
| **VAS** (Visual Analogue Scale) | Pain severity scoring (0–10 scale) |
| **EAPP** (Endometriosis-Associated Pelvic Pain) | Pain sub-type classification |
| **WPAI** (Work Productivity and Activity Impairment) | Functional impact — missed work, reduced activity |
| **EQ-5D / SF-36** | General health, sleep, mood baselines |

Key clinical patterns the system is designed to detect:

- **Cyclical pain escalation**: Pain worsening in luteal → menstrual phases and easing in follicular → ovulation (the hallmark of endometriosis)
- **Deep endometriosis triad**: Co-occurrence of dyschezia (painful bowel), dysuria (painful urination), and radiating back/leg pain
- **Progressive worsening**: Month-over-month increase in pain severity
- **Medication response patterns**: Poor NSAID efficacy with cyclical pain is a strong endo signal

---

## Architecture

```
src/lib/endometriosis.ts    ← Core module: types, scoring, pattern detection, AI context builder
src/lib/cycle.ts            ← Expanded symptoms (5 → 14), grouped by clinical category
src/lib/forecast.ts         ← Expanded MonthLog with phase-level and functional data
src/lib/gemma.ts            ← Updated AI system prompt and ReportData schema (Ollama path)
src/lib/webgpu-llm.ts       ← Updated AI system prompt and ReportData schema (WebGPU path)
src/store/nora.tsx          ← State: endoDailyLogs, endoRiskScore, medications, actions
src/routes/index.tsx        ← Dashboard: categorized symptom chips, endo risk badge
src/routes/report.tsx       ← Report: 8 metric cards, rich endo context for AI
```

---

## Tracked Variables

### Daily Log Entry (`EndoDailyLog`)

Each day, the following variables can be recorded:

#### Pain Variables (0–10 VAS Scale)

| Variable | Clinical Term | Description |
|---|---|---|
| `painOverall` | Overall pelvic pain | General pain severity |
| `painDysmenorrhea` | Dysmenorrhea | Period-specific pain |
| `painDyspareunia` | Dyspareunia | Pain during intercourse (0 = N/A) |
| `painDyschezia` | Dyschezia | Pain during bowel movements |
| `painDysuria` | Dysuria | Pain during urination |
| `painBackRadiating` | Radiating pain | Back, thigh, and leg pain radiation |

#### Pain Quality (Multi-Select)

| Value | Description |
|---|---|
| `"cramping"` | Rhythmic, squeezing pain — typical of superficial endo |
| `"stabbing"` | Sharp, localized — suggests nerve involvement |
| `"burning"` | Nerve-related, often deep infiltrating endo |
| `"throbbing"` | Pulsating pain |
| `"aching"` | Dull, persistent background pain |
| `"pressure"` | Heaviness or fullness in the pelvis |

#### GI & Urinary Symptoms

| Variable | Type | Values |
|---|---|---|
| `bloatingSeverity` | `number` (0–10) | Endo belly severity |
| `bowelChanges` | `BowelChange[]` | `"constipation"`, `"diarrhea"`, `"blood-in-stool"`, `"painful-gas"` |
| `urinarySymptoms` | `UrinarySymptom[]` | `"frequency"`, `"urgency"`, `"pain"` |

#### Flow & Bleeding

| Variable | Type | Values |
|---|---|---|
| `flowIntensity` | `FlowLevel` | `"none"`, `"spotting"`, `"light"`, `"moderate"`, `"heavy"`, `"flooding"` |
| `clotting` | `boolean` | Blood clots present |
| `intermenstrualBleeding` | `boolean` | Bleeding between periods |

#### Fatigue, Mood & Mental Health

| Variable | Type | Description |
|---|---|---|
| `fatigueSeverity` | `number` (0–10) | Overall fatigue |
| `energyLevel` | `number` (0–100) | Self-reported energy |
| `mood` | `MoodLevel` | `"great"`, `"good"`, `"okay"`, `"low"`, `"very-low"` |
| `anxietySeverity` | `number` (0–10) | Anxiety level |
| `brainFog` | `boolean` | Cognitive difficulty |

#### Functional Impact

| Variable | Type | Description |
|---|---|---|
| `missedWork` | `boolean` | Missed work or school |
| `reducedActivity` | `boolean` | Had to cut back on activities |
| `sleepQuality` | `SleepQuality` | `"good"`, `"fair"`, `"poor"`, `"none"` |

#### Medication Tracking

| Field | Type | Description |
|---|---|---|
| `category` | `MedicationCategory` | `"nsaid"`, `"paracetamol"`, `"hormonal-oc"`, `"progestin"`, `"gnrh-agonist"`, `"gnrh-antagonist"`, `"other"` |
| `name` | `string` | Medication name |
| `effective` | `boolean \| null` | Did it provide relief? (`null` = not yet assessed) |

#### Notes

| Variable | Type | Description |
|---|---|---|
| `notes` | `string` | Free-text observations |

---

## Composite Risk Scoring

The `computeEndoRiskScore()` function produces a **0–100 screening score** based on five weighted dimensions:

### Scoring Breakdown

| Dimension | Max Points | What It Measures |
|---|---|---|
| **Pain Severity & Cyclicality** | 30 | Average pain level + whether pain follows the menstrual cycle |
| **Multi-Organ Involvement** | 20 | Frequency of GI symptoms (dyschezia, bowel changes) + urinary symptoms (dysuria) |
| **Functional Impact** | 20 | Days missed work, reduced activity, poor sleep |
| **Progressive Worsening** | 15 | Is pain severity increasing over time? (requires ≥28 days of data) |
| **Symptom Constellation** | 15 | Deep endo triad (dyschezia + dysuria + back pain) + significant dyspareunia |

### Risk Categories

| Score | Category | Guidance |
|---|---|---|
| 0–24 | **Low** | Keep logging for pattern detection |
| 25–44 | **Moderate** | Some signals present — continue logging |
| 45–69 | **High** | Data should be shared with a healthcare provider |
| 70–100 | **Very High** | Strong screening signal — share with healthcare provider for evaluation |

### Minimum Data Requirements

- **7 daily logs** minimum to compute a risk score
- **14 daily logs** minimum for cyclical pattern detection
- **28 daily logs** minimum for progressive worsening analysis

---

## Cyclical Pattern Detection

The `detectCyclicalPattern()` function analyzes whether pain follows the menstrual cycle by:

1. Grouping all daily pain scores by their menstrual cycle phase (menstrual, follicular, ovulation, luteal)
2. Computing the average pain in each phase
3. Calculating a **cyclicality ratio**: `(menstrual + luteal avg) / (follicular + ovulation avg)`

### Interpretation

| Ratio | Interpretation |
|---|---|
| < 1.5 | No cyclical pattern — pain is relatively constant |
| 1.5 – 2.9 | Moderate cyclical pattern — worth discussing with a clinician |
| ≥ 3.0 | Strong cyclical pattern — highly consistent with endometriosis |

### Output

```typescript
type CyclicalPattern = {
  painIsCyclical: boolean;
  avgPainByPhase: Record<Phase, number>;
  cyclicalityRatio: number;
  summary: string; // Human-readable summary for the AI model
};
```

---

## AI Model Integration

### Context Builder

The `buildEndoContext()` function produces a structured text prompt with the following sections:

1. **CURRENT STATE** — Cycle day, phase, energy, active symptoms
2. **LAST 7 DAYS** — Daily log summaries with all pain types, GI/urinary, flow, meds, mood, sleep
3. **CYCLICAL PATTERN ANALYSIS** — Phase-averaged pain with cyclicality ratio
4. **COMPOSITE ENDO SCREENING SCORE** — Score, category, contributing flags
5. **MEDICATION HISTORY** — Usage frequency and efficacy per medication
6. **FUNCTIONAL IMPACT** — Days missed, reduced activity, poor sleep, average fatigue

### Updated System Prompt

The AI model is now instructed to analyze:

- Pain cyclicality (luteal → menstrual escalation)
- Deep endo triad (dyschezia + dysuria + radiating back/leg pain)
- Progressive month-over-month worsening
- Pain quality (stabbing/burning = nerve involvement; cramping = superficial)
- Medication response patterns (poor NSAID response + cyclical pain = strong signal)

### Updated Report Schema

The `ReportData.metrics` now includes 8 fields (4 new):

| Field | Example Value |
|---|---|
| `daysMissed` | `"3"` |
| `nsaidEfficacy` | `"Low"` |
| `avgPeakPain` | `"8.2 / 10"` |
| `cyclesLogged` | `"3 months"` |
| `painCyclicality` | `"Strong cyclical pattern"` |
| `giUrinaryInvolvement` | `"Present — bowel + bladder"` |
| `functionalImpact` | `"Severe"` |
| `compositeRiskScore` | `"72/100 (High)"` |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  User Action                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐    │
│  │ Tap symptom   │    │ Log pain pt  │    │ logEndoDaily()     │    │
│  │ chip          │    │ on mapper    │    │ (direct daily log) │    │
│  └──────┬───────┘    └──────┬───────┘    └────────┬───────────┘    │
│         │                   │                      │                │
│         ▼                   ▼                      │                │
│  toggleSymptom()     addPainPoint()                │                │
│         │                   │                      │                │
│         ▼                   ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                  logTodaySignals()                        │      │
│  │  - Updates MonthLog (legacy)                             │      │
│  │  - Creates/merges EndoDailyLog from current symptoms     │      │
│  │  - Recomputes endoRiskScore via computeEndoRiskScore()   │      │
│  └──────────────────────────┬───────────────────────────────┘      │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              State: endoDailyLogs[] (90 days max)        │      │
│  │              State: endoRiskScore (0-100)                │      │
│  └──────────────────────────┬───────────────────────────────┘      │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         ▼                   ▼                   ▼                  │
│  Dashboard UI        Report Page          AI Chat Context          │
│  (risk badge)     buildEndoContext()    (future integration)       │
│                         │                                          │
│                         ▼                                          │
│                  analyzeHealthData()                                │
│                  (Gemma / WebGPU)                                   │
│                         │                                          │
│                         ▼                                          │
│                  ReportData with                                    │
│                  endo-specific metrics                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Storage & Migration

### Storage Key

- **Current**: `nora-bloom-state-v4`
- **Legacy (auto-migrated)**: `nora-bloom-state-v3`, `nora-bloom-state-v2`, `nora-bloom-state-v1`

### New State Fields

| Field | Type | Default |
|---|---|---|
| `endoDailyLogs` | `EndoDailyLog[]` | `[]` |
| `endoRiskScore` | `number` | `0` |
| `medications` | `MedicationEntry[]` | `[]` |

### Daily Log Retention

- Maximum **90 entries** retained (≈3 menstrual cycles)
- Oldest entries are automatically pruned when the limit is exceeded

### Merge Behavior

When a daily log is updated (same date):
- **Pain scores**: Takes the maximum value
- **Boolean flags**: OR — once flagged, stays flagged for the day
- **Array fields**: Union with deduplication (pain qualities, bowel changes, urinary symptoms)
- **Medications**: Merged by `category:name` key

---

## UI Changes

### Dashboard (`/`)

1. **Symptom chips** are now grouped into 3 clinical categories:
   - **Pain** (4): Bad Cramps, Radiating Leg Pain, Back Pain, Painful Intercourse
   - **GI & Urinary** (4): Endo Belly, Painful Bowel, Painful Urination, Nausea
   - **General** (6): Heavy Flow, Clotting, Spotting, Fatigue, Brain Fog, Low Mood

2. **Endo Screening Score badge** appears after 7+ days of tracking, showing:
   - Score out of 100
   - Color-coded risk category (green/amber/red)
   - Days tracked count
   - "Not a diagnosis" disclaimer

### Report Page (`/report`)

1. **8 metric cards** (up from 4):
   - Days Missed Work/School
   - NSAID Efficacy
   - Avg. Peak Pain
   - Cycles Logged
   - **Pain Cyclicality** (new)
   - **GI/Urinary Involvement** (new)
   - **Functional Impact** (new)
   - **Endo Risk Score** (new)

2. **Richer AI context** via `buildEndoContext()` instead of a simple symptom string

---

## Files Changed

| File | Action | Summary |
|---|---|---|
| `src/lib/endometriosis.ts` | **NEW** | Core module — types, scoring, pattern detection, AI context builder |
| `src/lib/cycle.ts` | Modified | Symptoms expanded 5 → 14 with category grouping |
| `src/store/nora.tsx` | Modified | New state fields, actions, auto-population of daily logs, v4 migration |
| `src/lib/forecast.ts` | Modified | MonthLog expanded, evaluateEndoRisk upgraded |
| `src/lib/gemma.ts` | Modified | ReportData schema + system prompt enriched for endo analysis |
| `src/lib/webgpu-llm.ts` | Modified | WebGPU system prompt mirrored |
| `src/routes/report.tsx` | Modified | 8 metric cards, buildEndoContext() integration |
| `src/routes/index.tsx` | Modified | Categorized symptom chips, endo risk score badge |

---

## Disclaimer

> NORA is **not** a diagnostic device. The composite screening score, cyclical pattern analysis, and all related outputs are designed to support — not replace — conversations with healthcare professionals. All findings are framed as "screening signals" or "pattern analysis" to share with a clinician.
