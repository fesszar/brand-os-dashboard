# Steering — Brand OS Dashboard

## Critical Context
- This is a Next.js 15 dashboard for Brand OS (social media content automation)
- Reads/writes files directly from Brand OS workspace at `~/.openclaw/workspace-ozzymandias/`
- NO database — all data is JSON files on disk
- Dark mode default: `#071021` primary, `#22D3A6` accent
- Must be mobile-friendly (user uploads videos from phone)
- Stack: Next.js, TailwindCSS, shadcn/ui, TypeScript

## Brand OS File Paths (read from these)
- Storybooks: `skills/brand-os/brands/<brand_id>/storybook.json`
- Hook rotation: `skills/brand-os/brands/<brand_id>/hook-rotation.json`
- Drafts: `brand-marketing/drafts/<brand_id>/<date>-<slot>/meta.json`
- Scripts: `brand-marketing/scripts/gideonawolesi/<date>-<slot>/script.json`
- Uploads: `brand-marketing/uploads/<brand_id>/`
- Experiments: `skills/brand-os/brands/<brand_id>/experiments.jsonl`
- Config: `brand-marketing/config.json`

## Active Brands
- `invoicerate` (3 posts/day)
- `gideonawolesi` (2 posts/day)
- `fessburn` (Mon/Wed/Fri)

## Phase 1 Already Done (by Codex)
- API routes: brands, drafts, generate, publish, activity, health
- App shell with sidebar nav
- Brands page, dashboard page
- 12 shadcn UI components
- Brand data layer (brand-os.ts), type system

## Current Priority
Continue with Phase 2: Calendar view, Video scripts, Publishing history, Cron manager.
Then Phase 3: Analytics, Experiment tracker, Funnel analytics, **Codex Verify pipeline & dashboard integration**.

## Verify Gate (Section 8 of REQUIREMENTS.md)
Every draft has `meta.verify` with: passed, score, checks, issues.
Dashboard must show verify status: ✅ Passed / ⚠️ Issues / ❌ Failed / ⏳ Pending.
Click to expand shows individual check results.
Override button allows manual publish of failed drafts.

## Do NOT
- Add a database
- Use emoji in canvas/overlay text generation
- Hardcode fake QA scores
- Use `SELF_ONLY` or `DIRECT_POST` for TikTok (must be `UPLOAD`)
