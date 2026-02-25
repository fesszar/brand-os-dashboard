export type BrandStatus = "active" | "inactive" | "decommissioned";

export type BrandCard = {
  id: string;
  name: string;
  status: BrandStatus;
  category?: string;
  postsThisWeek: number;
  engagementRate: number;
  nextScheduledPost: string | null;
  tagline?: string;
};

export type DraftEntry = {
  brandId: string;
  slotDir: string;
  date: string;
  slot: string;
  status: string;
  createdAt: string | null;
  angle?: string;
  angleName?: string;
  contentType?: string;
  targets: string[];
  publishReport?: string;
  hasVideo: boolean;
  captions?: Record<string, string>;
  textPreview?: string;
};

export type ActivityEntry = {
  id: string;
  type:
    | "draft_generated"
    | "post_published"
    | "video_script_sent"
    | "video_uploaded"
    | "warmup_completed"
    | "analytics_ingested"
    | "cron_fired"
    | "cron_failed";
  brandId: string;
  status: "ok" | "failed" | "info";
  timestamp: string;
  message: string;
  detail?: string;
  platform?: string;
};

export type HealthSummary = {
  scheduledToday: number;
  publishedToday: number;
  failedToday: number;
  skippedToday: number;
  uploadQueue: number;
  nextPostAt: string | null;
};

export type ScriptEntry = {
  brandId: string;
  slotDir: string;
  shortCode: string;
  angleId?: string;
  angleName?: string;
  hook?: string;
  slot: string;
  date: string;
  status: "pending" | "recorded" | "published";
  hasMatchedVideo: boolean;
};

export type UploadEntry = {
  brandId: string;
  filename: string;
  path: string;
  status: "pending" | "posted" | "published";
  uploadedAt: string;
  sizeBytes: number;
};

export type PublishEntry = {
  id: string;
  brandId: string;
  date: string;
  time: string;
  contentType: string;
  postedTargets: string[];
  ok: boolean;
  slot: string;
  captionPreview?: string;
  postizPostIds: string[];
  reportPath: string;
};

export type CronEntry = {
  id: string;
  name: string;
  schedule: string;
  nextRun?: string;
  lastRun?: string;
  lastStatus: "ok" | "failed" | "unknown";
  enabled: boolean;
  group?: string;
};

export type ExperimentEntry = {
  logged_at?: string;
  brand_id?: string;
  channel_id?: string;
  source?: string;
  hypothesis?: string;
  metric?: string;
  aggregate?: {
    posts?: number;
    views?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    engagement?: number;
    engagement_rate?: number;
  };
  [key: string]: unknown;
};
