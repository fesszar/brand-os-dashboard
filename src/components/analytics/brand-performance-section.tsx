import { BarList } from "@/components/charts/bar-list";
import { compactNumber, percent } from "@/components/charts/format";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { StatTile } from "@/components/analytics/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrandPerformance, NamedSummary } from "@/lib/analytics";

function angleItems(angles: NamedSummary[]) {
  return angles.map((angle) => ({
    label: angle.name,
    value: angle.engagementRate,
    display: percent(angle.engagementRate, 2),
    detail: `${angle.posts} posts · ${compactNumber(angle.views)} views`,
  }));
}

export function BrandPerformanceSection({ data }: { data: BrandPerformance }) {
  const top = data.angles.slice(0, 3);
  const worst = data.angles.length > 3 ? data.angles.slice(-3).reverse() : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Posts tracked" value={String(data.totals.posts)} />
        <StatTile label="Views" value={compactNumber(data.totals.views)} />
        <StatTile label="Engagement rate" value={data.totals.rows ? percent(data.totals.engagementRate, 2) : "—"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views per day</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart label="Views" format="compact" points={data.daily.map((d) => ({ x: d.date, y: d.views }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Engagement rate per day</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              label="Engagement rate"
              format="percent"
              points={data.daily.map((d) => ({ x: d.date, y: d.engagementRate }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Platforms</CardTitle>
            <CardDescription>Engagement rate per platform</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={angleItems(data.platforms)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top angles</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={angleItems(top)} emptyText="No angle data logged." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weakest angles</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={angleItems(worst)} emptyText="Needs more than 3 angles to rank." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
