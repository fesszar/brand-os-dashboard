import { addSeconds, formatDistanceToNowStrict } from "date-fns";

import { QuickActions } from "@/components/quick-actions";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActivityFeed, getBrandList, getHealthSummary, getTodayTimeline } from "@/lib/brand-os";

function countdownTo(nextPostAt: string | null) {
  if (!nextPostAt) {
    return "No upcoming post";
  }

  const seconds = Math.max(0, Math.floor((Date.parse(nextPostAt) - Date.now()) / 1000));
  if (seconds === 0) {
    return "Due now";
  }

  return formatDistanceToNowStrict(addSeconds(new Date(), seconds), { addSuffix: true });
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [timeline, health, activity, brands] = await Promise.all([
    getTodayTimeline(),
    getHealthSummary(),
    getActivityFeed(25),
    getBrandList(),
  ]);

  const publishRate = health.scheduledToday
    ? Math.round((health.publishedToday / health.scheduledToday) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Brand OS</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Dashboard Home</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Live command center for drafts, publishing activity, and pipeline health across all
          brands.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Posts Published / Scheduled</CardDescription>
            <CardTitle>
              {health.publishedToday} / {health.scheduledToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={publishRate} />
            <p className="mt-2 text-xs text-slate-400">{publishRate}% completion today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Failed / Skipped</CardDescription>
            <CardTitle>
              {health.failedToday} / {health.skippedToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Failures and skips detected in today queue.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Upload Queue</CardDescription>
            <CardTitle>{health.uploadQueue}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Pending videos waiting to be matched.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Next Post Countdown</CardDescription>
            <CardTitle>{countdownTo(health.nextPostAt)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Based on today&apos;s scheduled slot timeline.</p>
          </CardContent>
        </Card>
      </div>

      <QuickActions brands={brands.map((brand) => ({ id: brand.id, name: brand.name }))} />

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Content Timeline</CardTitle>
            <CardDescription>Scheduled posts for {new Date().toDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.length ? (
                  timeline.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.slot}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.brandId}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {item.targets.join(", ") || "n/a"}
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-xs text-slate-400">
                        {item.preview}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">
                      No scheduled posts found for today.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Latest Brand OS events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.length ? (
              activity.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="outline">{entry.brandId}</Badge>
                    <StatusBadge status={entry.status} />
                  </div>
                  <p className="text-sm text-slate-200">{entry.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No activity events yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
