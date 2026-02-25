# Brand OS Dashboard — Full Build (Phases 1-4)

Read REQUIREMENTS.md for the complete specification.

## Critical Context

This dashboard is a web UI for "Brand OS" — an automated social media content pipeline. 
It manages multiple brands, generates AI slideshows, sends video scripts, publishes to social platforms via Postiz, and tracks analytics.

All data lives in files on the local filesystem at:
`/Users/clawdraider/.openclaw/workspace-ozzymandias/`

Key paths:
- Brands: `skills/brand-os/brands/<brand_id>/storybook.json`
- Hook rotations: `skills/brand-os/brands/<brand_id>/hook-rotation.json`  
- Experiments: `skills/brand-os/brands/<brand_id>/experiments.jsonl`
- Screenshots: `skills/brand-os/brands/<brand_id>/context/screenshots/`
- Image context: `skills/brand-os/brands/<brand_id>/context/image_context.json`
- Drafts: `brand-marketing/drafts/<brand_id>/<date>-<slot>/`
- Uploads: `brand-marketing/uploads/<brand_id>/`
- Scripts: `brand-marketing/scripts/<brand_id>/<date>-<slot>/`
- Postiz config: `brand-marketing/config.json`
- Active brands: invoicerate, gideonawolesi, fessburn, relaystack
- Inactive: rottenswamp (decommissioned), brand_alpha (template), life_with_ozzy (old name)

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui components
- TypeScript
- No database — file-system reads/writes only
- OpenClaw CLI for cron management (`openclaw cron list --json`, `openclaw cron run <id>`, etc.)
- Dark mode default theme

## Build Order

### Phase 1: Foundation + Dashboard Home
1. `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (if not already done)
2. Install shadcn/ui and set up dark theme
3. Build the layout: sidebar navigation + main content area
4. Dashboard home page:
   - Today's content timeline (read from drafts directories)
   - Content health score cards
   - Activity feed (read from publish-result-*.json files)
   - Quick action buttons
5. Brand list page with cards showing all brands

### Phase 2: Brand Management + Content Pipeline  
1. Brand detail page with tabs:
   - Storybook viewer/editor (visual form for storybook.json)
   - Hook rotation table (sortable, expandable angles)
   - Screenshots grid with upload
   - Connected accounts (from brand-marketing/config.json)
2. Content calendar (weekly/monthly view)
3. Drafts queue (list with previews, publish action)
4. Video scripts page (list with status tracking)
5. Upload center (drag-and-drop video upload)

### Phase 3: Publishing + Automation
1. Publish history (read all publish-result-*.json files)
2. Platform settings per brand
3. Cron job manager (uses `openclaw cron list --json` output)
4. Pipeline monitor visualization
5. Warmup status display

### Phase 4: Analytics + Settings
1. Cross-brand analytics (read experiments.jsonl)
2. Per-brand performance charts
3. Funnel analytics for GideonAwolesi
4. Experiment tracker
5. Global settings page
6. Brand management (add/decommission/clone)

## Design Requirements
- Dark theme (#071021 primary, #22D3A6 accent, slate neutrals)
- Mobile responsive (especially upload center — used from phone)
- Clean, modern dashboard aesthetic (shadcn/ui components)
- Fast — cache file reads, lazy load where appropriate

## API Routes
All API routes are Next.js Route Handlers that read/write files at the WORKSPACE path.
Set WORKSPACE env var to `/Users/clawdraider/.openclaw/workspace-ozzymandias`

## Important
- Build ALL 4 phases in sequence. Do not stop after Phase 1.
- Commit after each phase.
- Make sure `npm run dev` works at each phase.
- When completely finished with ALL 4 phases, run:
  `openclaw system event --text "Done: Brand OS Dashboard complete — all 4 phases built. Run 'cd ~/Projects/brand-os-dashboard && npm run dev' to start." --mode now`

