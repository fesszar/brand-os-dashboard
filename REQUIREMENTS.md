# Brand OS Dashboard — Full Requirements

## Overview

A web dashboard that gives Gideon complete visibility and control over the entire Brand OS content pipeline. Accessible from any device (phone, laptop). Everything Ozymandias can do in Brand OS, Gideon can see and control here.

---

## 1. DASHBOARD (Home)

### 1.1 Command Center
- **Today's Content Timeline**: Visual timeline showing all scheduled posts across all brands for today
  - Each post shows: time, brand, platform icons, status (scheduled / generating / published / failed)
  - Click to expand: see the actual content, slides/video, captions
- **Content Health Score**: At-a-glance metrics
  - Posts published today / scheduled today
  - Posts failed / skipped today
  - Upload queue status (videos waiting)
  - Next post countdown
- **Quick Actions Bar**:
  - "Generate Draft Now" → pick brand + slot → triggers generation
  - "Publish Now" → pick from ready drafts → triggers publish
  - "Upload Video" → drag-and-drop → assigns to brand + slot

### 1.2 Activity Feed
- Chronological log of everything Brand OS did:
  - Draft generated (brand, angle, slot)
  - Post published (brand, platforms, success/fail per platform)
  - Video script sent (short code, angle)
  - Video uploaded (matched to which script)
  - Warmup completed
  - Analytics ingested
  - Cron job fired/failed
- Filterable by: brand, action type, status, date range

---

## 2. BRANDS

### 2.1 Brand List
- Cards for each brand: logo/color, name, status (active/inactive/decommissioned)
- Quick stats per brand: posts this week, engagement rate, next scheduled post
- Click into brand → full brand management

### 2.2 Brand Detail Page

#### 2.2.1 Storybook Editor
- Visual editor for the full storybook.json:
  - **Identity**: name, category, positioning (for_who, primary_pain, promise, differentiation, proof_points)
  - **Voice**: tone sliders (visual sliders 0-1), style rules, vocabulary (preferred/banned words)
  - **Messaging Pillars**: weight sliders, allowed/forbidden claims, example topics per pillar
  - **Funnel** (GideonAwolesi): stage weights, CTAs per stage, example hooks
  - **Visual Style**: colors, typography, layout rules, image gen prompts
  - **Channels**: platform-specific cadence, formats
  - **Compliance**: disclaimers, forbidden topics
- Save → validates JSON schema → writes to disk
- "Preview" button → shows how a generated post would look with current settings

#### 2.2.2 Hook Rotation Manager
- Table of all angles: ID, name, hook, funnel stage, last used, times used, avg engagement
- Sortable by performance, last used, funnel stage
- Add/edit/delete angles inline
- Per angle: expand to see overlay_texts (6 slides) and platform captions
- Drag-and-drop reorder
- "Test Generate" → generates a draft with this specific angle (dry run)

#### 2.2.3 Screenshots & Assets
- Grid view of all screenshots in context/screenshots/
- Upload new screenshots (drag-and-drop, multi-file)
- Delete screenshots
- Image context viewer: shows image_context.json analysis for each image
- "Re-analyze" button → triggers image analysis for new/changed screenshots

#### 2.2.4 Connected Accounts
- Shows all Postiz integrations for this brand
- Per platform: integration ID, account name, status (connected/disconnected)
- "Connect New" → links to Postiz to add integration
- "Test Post" → dry-run publish to verify connection works
- Platform-specific settings: TikTok (UPLOAD mode), Instagram (post type), etc.

#### 2.2.5 Analytics
- Engagement charts: views, likes, shares, comments, profile visits over time
- Per-platform breakdown
- Top performing angles (from experiments.jsonl)
- Worst performing angles
- Posting frequency chart
- Best posting times (heatmap)
- Funnel conversion tracking: how many DMs/leads came from content

---

## 3. CONTENT PIPELINE

### 3.1 Calendar View
- Monthly/weekly calendar showing all content across all brands
- Color-coded by brand
- Each cell shows: brand icon, time, status, content type (video/slideshow/image)
- Click cell → preview content + edit captions + approve/reject
- Drag to reschedule

### 3.2 Drafts Queue
- List of all generated drafts not yet published
- Per draft: brand, slot, date, angle, content type, thumbnail preview
- Actions: Preview, Edit Captions, Publish Now, Delete
- Bulk actions: select multiple → publish all / delete all
- Filter by: brand, status (pending/published/failed), date

### 3.3 Video Scripts
- List of all generated video scripts
- Per script: short code, angle, funnel stage, date, status (pending/recorded/published)
- Preview the full script
- Status tracking: script sent → video uploaded → matched → published
- Direct video upload per script (drag-and-drop .mp4/.mov)

### 3.4 Upload Center
- Drag-and-drop zone for video uploads
- Auto-matches to scripts by filename short code
- Manual assignment: select script/slot to assign video to
- Upload history: what was uploaded, when, matched to what, published where
- Supports bulk upload (record 5 videos Sunday → upload all at once)

---

## 4. PUBLISHING

### 4.1 Publish History
- Full history of all published posts across all brands
- Per post: date, time, brand, platforms, content type, caption preview, engagement metrics
- Expand: full captions per platform, slide images, Postiz post IDs, publish result JSON
- Filter by: brand, platform, date range, content type (video/slideshow)
- Export to CSV

### 4.2 Platform Settings
- Per-brand platform configurations:
  - TikTok: privacy level, posting method (UPLOAD enforced), disclosure settings
  - Instagram: post type, hashtag strategy
  - Facebook: page selection, cross-posting
  - LinkedIn: personal vs company page
  - X/Twitter: thread vs single post
- Global defaults + per-brand overrides

### 4.3 Postiz Connection
- API key management (masked display)
- Connection test button
- Integration mapping: brand → platform → Postiz integration ID
- Sync status: last successful API call, any errors

---

## 5. AUTOMATION

### 5.1 Cron Job Manager
- Visual list of all Brand OS cron jobs (read from OpenClaw)
- Per job: name, schedule (human-readable), last run time, last status, next run
- Actions: Enable/Disable, Run Now, Edit Schedule, View Last 5 Runs
- Grouped by: brand, type (generate/publish/warmup/script/analytics)
- Health indicators: green (running normally), yellow (last run had issues), red (failed 3x)

### 5.2 Pipeline Monitor
- Visual flow diagram: Generate → Draft → Publish → Analytics
- Per brand, shows current state of each stage
- Alerts: drafts without publish, failed generations, missing uploads

### 5.3 Warmup Status
- Last warmup per brand/platform
- Warmup chaos engine visualization (cool visual of the timing patterns)
- Manual warmup trigger

---

## 6. ANALYTICS DEEP DIVE

### 6.1 Cross-Brand Performance
- Side-by-side comparison: all brands' engagement metrics
- Best performing brand/platform combination
- Content type comparison: video vs slideshow performance
- Posting time analysis across all brands

### 6.2 Experiment Tracker
- Active experiments from experiments.jsonl
- Per experiment: hypothesis, variants, current data, statistical significance
- Archive completed experiments
- Create new experiment

### 6.3 Funnel Analytics (GideonAwolesi)
- Funnel stage performance: which stage gets most engagement?
- CTA performance: which CTAs drive most DMs?
- Conversion tracking: content → profile visit → DM → lead → client
- Weekly lead report

---

## 7. SETTINGS

### 7.1 Global Settings
- Timezone
- Default model for generation (Opus) / publishing (Flash)
- Postiz API configuration
- Notification preferences (what to send to Telegram)

### 7.2 Brand Management
- Add new brand (wizard: name, platforms, create storybook skeleton)
- Decommission brand (disable all crons, mark inactive)
- Clone brand (copy storybook + hooks as starting point)

### 7.3 Content Rules
- Anti-bias rules (InvoiceRate max 1 in 10 for GideonAwolesi)
- Mandatory disclosure rules (AI-generated content)
- Banned words/phrases across all brands
- CTA rules (what's banned, what's required)

---

## Technical Architecture

### Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API routes reading/writing Brand OS files directly
- **Data**: File-system based (reads storybook.json, hook-rotation.json, experiments.jsonl, meta.json, etc.)
- **Auth**: Simple password protection (single user — Gideon)
- **Hosting**: Local on Mac mini (same machine as OpenClaw) OR Vercel with file API proxy
- **Real-time**: WebSocket or polling for live pipeline status updates

### Key Design Decisions
- **No database**: Everything reads from/writes to the existing Brand OS file structure. The dashboard is a UI layer on top of files that already exist.
- **OpenClaw integration**: Cron management via `openclaw cron` CLI commands. Job triggers via `openclaw cron run`.
- **Postiz integration**: Direct API calls for connection testing and post status.
- **File uploads**: Videos uploaded through dashboard → saved to `brand-marketing/uploads/<brand>/`
- **Mobile-friendly**: Gideon records videos on phone → can upload directly from phone browser

### File System Mapping
```
Dashboard Page          → File/Directory
───────────────────────────────────────────
Brand Storybook         → skills/brand-os/brands/<id>/storybook.json
Hook Rotation           → skills/brand-os/brands/<id>/hook-rotation.json
Analytics               → skills/brand-os/brands/<id>/experiments.jsonl
Screenshots             → skills/brand-os/brands/<id>/context/screenshots/
Image Context           → skills/brand-os/brands/<id>/context/image_context.json
Drafts                  → brand-marketing/drafts/<id>/<date>-<slot>/
Video Uploads           → brand-marketing/uploads/<id>/
Video Scripts           → brand-marketing/scripts/<id>/<date>-<slot>/
Postiz Config           → brand-marketing/config.json
Global Config           → tiktok-marketing/config.json
Cron Jobs               → openclaw cron list/edit/run CLI
Publish Results         → brand-marketing/drafts/<id>/<date>-<slot>/publish-result-*.json
```

### API Endpoints Needed
```
GET  /api/brands                    → list all brands with stats
GET  /api/brands/:id                → full brand detail
PUT  /api/brands/:id/storybook      → update storybook
GET  /api/brands/:id/angles         → list hook rotation angles
PUT  /api/brands/:id/angles         → update angles
POST /api/brands/:id/angles         → add new angle
GET  /api/brands/:id/analytics      → experiments data
GET  /api/brands/:id/screenshots    → list screenshots
POST /api/brands/:id/screenshots    → upload screenshot
GET  /api/brands/:id/integrations   → Postiz connections

GET  /api/drafts                    → list all drafts
GET  /api/drafts/:brand/:slot       → draft detail with slides
POST /api/drafts/:brand/generate    → trigger draft generation
POST /api/drafts/:brand/publish     → trigger publish

GET  /api/scripts                   → list video scripts
GET  /api/scripts/:brand/:slot      → script detail
POST /api/uploads/:brand            → upload video file
GET  /api/uploads/:brand            → list pending uploads

GET  /api/crons                     → list all cron jobs
POST /api/crons/:id/run             → trigger cron run
POST /api/crons/:id/toggle          → enable/disable

GET  /api/calendar                  → calendar view data
GET  /api/activity                  → activity feed
GET  /api/health                    → pipeline health check
```

### Phases (Build Order)
- **Phase 1 (MVP)**: Dashboard home + Brand list + Storybook viewer + Drafts queue + Upload center
- **Phase 2**: Calendar view + Video scripts + Publishing history + Cron manager
- **Phase 3**: Analytics deep dive + Experiment tracker + Funnel analytics
- **Phase 4**: Full storybook editor + Hook rotation manager + Brand wizard

### Estimated Build Time
- Phase 1: 2-3 days (coding agent)
- Phase 2: 2-3 days
- Phase 3: 2-3 days  
- Phase 4: 2-3 days
- **Total: ~10-12 days** with coding agent (Codex/Claude Code)

---

## Non-Functional Requirements
- **Mobile responsive**: Must work on iPhone for video uploads from phone
- **Fast**: File reads should be cached, no unnecessary re-reads
- **Safe**: All writes validate JSON schema before saving. Backup before overwrite.
- **Offline-resilient**: Dashboard shows last known state if OpenClaw gateway is temporarily down
- **Dark mode**: Default dark theme matching brand aesthetics
