import { BarList } from "@/components/charts/bar-list";
import { compactNumber, percent } from "@/components/charts/format";
import { HourHeatmap } from "@/components/charts/hour-heatmap";
import { StatTile } from "@/components/analytics/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CrossBrandAnalytics } from "@/lib/analytics";

export function CrossBrandSection({ data }: { data: CrossBrandAnalytics }) {
  const views = data.brands.reduce((sum, b) => sum + b.views, 0);
  const engagement = data.brands.reduce((sum, b) => sum + b.engagement, 0);
  const best = data.bestCombo;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total views" value={compactNumber(views)} detail={`${data.brands.length} brands`} />
        <StatTile label="Overall engagement rate" value={views ? percent(engagement / views, 2) : "—"} detail={`${compactNumber(engagement)} engagements`} />
        <StatTile
          label="Best brand × platform"
          value={best ? `${best.brandId} · ${best.platform}` : "—"}
          detail={best ? `${percent(best.engagementRate, 2)} on ${compactNumber(best.views)} views` : "Needs posts with views"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Brand comparison</CardTitle>
            <CardDescription>Totals from experiments.jsonl analytics rows</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Posts</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.brands.map((brand) => (
                  <TableRow key={brand.brandId}>
                    <TableCell>{brand.brandId}</TableCell>
                    <TableCell className="text-right tabular-nums">{brand.posts}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactNumber(brand.views)}</TableCell>
                    <TableCell className="text-right tabular-nums">{compactNumber(brand.engagement)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brand.rows ? percent(brand.engagementRate, 2) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content type</CardTitle>
            <CardDescription>Engagement rate by format</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.contentTypes.map((type) => ({
                label: type.name,
                value: type.engagementRate,
                display: percent(type.engagementRate, 2),
                detail: `${type.posts} posts · ${compactNumber(type.views)} views`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Best posting times</CardTitle>
          <CardDescription>Engagement rate by hour posted (UTC)</CardDescription>
        </CardHeader>
        <CardContent>
          <HourHeatmap rows={data.hourly.map((row) => ({ label: row.brandId, values: row.rates }))} />
        </CardContent>
      </Card>
    </div>
  );
}
