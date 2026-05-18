## v1: Audience Intelligence + Campaign Studio

Transforms ScrollMarketer from a content generator into a **strategy-first growth engine**. Every campaign will be grounded in a real ICP, persona, and journey stage — no more generic posts.

Subsequent phases (Lead Capture → Prospect Discovery → Sales Copilot → Revenue Intel) ship later in sequence.

---

### What ships in v1

**1. New "Audience" section** (`/audience`)
- Per-app workspace. One click: **"Build my audience"** → AI generates the full intelligence pack from app name, description, website, audience field + Perplexity-grounded web research.
- **Outputs (all editable cards):**
  - 1–3 **ICPs** (segment, company size, industry, signals)
  - 2–4 **Personas** (title, responsibilities, pains, goals, triggers, objections, preferred channels, content style)
  - **Pain points** & **buyer motivations** (ranked)
  - **Objections** + recommended rebuttals
  - **Customer journey** — 5 stages (Awareness → Retention), each with: customer thinking, pains, best content, best CTA, channels
  - **Messaging angles** (3–6 angle bank: authority, contrarian, story-driven, ROI, fear-of-missing-out, etc.)
  - **Channel recommendations** (where to play)
- Visual: card-based, scan-friendly, mobile-first, editable inline.

**2. "Content" renamed → "Campaigns"** (Campaign Studio)
- Generation form gains two required dropdowns: **Persona** + **Journey Stage**.
- Optional: **Messaging angle** picker.
- Replaces topic-only generation with **strategy-anchored generation**: the AI receives the full persona card + journey stage + angle in the prompt.
- Multi-channel output stays (LinkedIn / X / future Email/LP), but tone & structure adapt per persona + stage.
- Each generated post is tagged with `persona_id`, `journey_stage`, `angle` for future attribution.

**3. Content quality upgrade**
- Rewritten system prompts: stronger hooks, emotional tension, authority framing, platform-native structure, anti-AI-cliché list (banned words: "revolutionize", "unlock", "leverage", "in today's fast-paced…").
- Per-platform refinement: LinkedIn = executive narrative, X = scroll-stopping hook.
- Quality gate updated to score against persona fit + hook strength.

**4. Image quality upgrade**
- New visual planner: editorial composition prompts (Apple/Stripe/McKinsey reference style), real typography, high contrast, no clipart/abstract shapes.
- Per-persona visual tone (e.g. exec persona → muted navy/cream + serif headlines; founder persona → bold gradients).

**5. Navigation (hybrid)**
- Add: **Audience** (new), rename **Content → Campaigns**.
- Keep: Dashboard, Apps, Calendar, Analytics, Weekly Reports, Revenue, Funding, Settings.
- No destructive moves.

---

### What does NOT ship in v1 (and why)

| Feature | Why deferred |
|---|---|
| Prospect Discovery / lead scoring | Phase 2 — needs data source decisions and is meaningless without strong audience layer first |
| Landing page generator | Phase 2 — gates on attribution model |
| Revenue dashboard, CAC/ROI | Phase 3 — needs real conversion data flowing first |
| Sales Copilot (cold emails, objections) | Phase 4 |
| Growth Recommendations engine | Phase 5 — needs ≥4 weeks of performance data |
| Meta Ads boost flow | Paused per your call |

---

### Technical section

**New tables (one migration):**

```text
audience_profiles    one row per app   (status, last_generated_at, raw_research_md)
icps                 N per app          (segment, company_size, industry, signals[], notes)
personas             N per app          (title, company_size, responsibilities, pains[], goals[],
                                         triggers[], objections[], channels[], content_style, icp_id?)
journey_stages       5 per app          (stage enum, thinking, pains[], best_content, best_cta, channels[])
messaging_angles     N per app          (angle_name, hook_template, when_to_use, example)
```

All RLS-scoped by `user_id`. Standard `update_updated_at_column` trigger.

**Extend `content`:** add `persona_id` (nullable FK), `journey_stage` (text), `messaging_angle` (text).

**New edge functions:**
- `generate-audience-intelligence` — orchestrator. Uses Perplexity `sonar` for grounded industry/competitor research → Gemini 3 Flash for structured ICP/persona/journey/angle generation via tool-calling. Writes all 5 tables in a transaction.
- `regenerate-personas` (lighter, persona-only refresh).

**Updated edge functions:**
- `generate-content` — accepts `persona_id`, `journey_stage`, `angle`; loads persona row; injects into prompt. New anti-cliché filter + persona-aware tone.
- `generate-post-image` — accepts persona; new editorial visual planner prompt with explicit style references.
- `quality-gate` — new dimension: persona-fit score.

**Frontend:**
- New: `src/pages/Audience.tsx`, `src/components/audience/{ICPCard,PersonaCard,JourneyTimeline,AngleBank,GenerateAudienceButton}.tsx`
- New hooks: `useAudience.ts`, `useGenerateAudience.ts`, `usePersonas.ts`, `useJourneyStages.ts`
- Rename: `Content.tsx` → keep file but page title/breadcrumbs/nav label → "Campaigns"
- Update: `CreatePost.tsx` (or wherever generation form lives) → add Persona + Journey + Angle pickers, default to first persona if exists, prompt user to generate audience first if not.
- Sidebar: add Audience nav item, rename Content → Campaigns.

**Memory updates:** new `mem://features/audience-intelligence`, `mem://features/campaign-studio`, update content-preferences with anti-cliché list and persona-aware tone rules.

---

### Order of execution

1. Migration (5 new tables + 3 columns on `content`)
2. `generate-audience-intelligence` edge function + Perplexity/Gemini orchestration
3. `/audience` page + cards + generate button
4. Wire Persona + Journey + Angle into `generate-content` and `CreatePost` UI
5. Upgrade content + image prompts (anti-cliché, editorial visuals)
6. Nav rename + new sidebar item
7. Memory updates

Approve and I'll start with the migration.