import { BarList } from "@/components/charts/bar-list";
import { compactNumber, percent } from "@/components/charts/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FunnelAnalytics } from "@/lib/analytics";

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-slate-400">
        {text}
      </TableCell>
    </TableRow>
  );
}

export function FunnelSection({ data }: { data: FunnelAnalytics }) {
  const top = data.conversion[0]?.value ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Conversion: content → client</CardTitle>
          <CardDescription>Summed from logged rows; each step shows conversion from the previous one</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-5">
            {data.conversion.map((step, index) => {
              const previous = index ? data.conversion[index - 1].value : 0;
              return (
                <li key={step.step} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400">{step.step}</p>
                  <p className="text-2xl font-semibold text-slate-100">{compactNumber(step.value)}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                    <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${top ? Math.max(step.value ? 2 : 0, (step.value / top) * 100) : 0}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {index === 0 ? "Top of funnel" : previous ? `${percent(step.value / previous)} of ${data.conversion[index - 1].step}` : "—"}
                  </p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funnel stages</CardTitle>
            <CardDescription>Actual share of posts vs storybook target weight</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Posts</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Eng. rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stages.length ? (
                  data.stages.map((stage) => (
                    <TableRow key={stage.stage}>
                      <TableCell className="capitalize">{stage.stage}</TableCell>
                      <TableCell className="text-right tabular-nums">{stage.posts}</TableCell>
                      <TableCell className="text-right tabular-nums">{percent(stage.shareOfPosts, 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">{stage.targetWeight === null ? "—" : percent(stage.targetWeight, 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">{stage.rows ? percent(stage.engagementRate, 2) : "—"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow colSpan={5} text="No funnel stages defined or logged (funnel_stage)." />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CTA performance</CardTitle>
            <CardDescription>DMs driven per CTA</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              emptyText="No rows with a cta field logged yet."
              items={data.ctas.map((cta) => ({
                label: cta.cta,
                value: cta.dms,
                display: `${cta.dms} DMs · ${cta.leads} leads`,
                detail: `${cta.posts} posts · ${cta.dmsPerPost.toFixed(2)} DMs/post`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly lead report</CardTitle>
          <CardDescription>Last 12 weeks (week starting Monday, UTC)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week of</TableHead>
                <TableHead className="text-right">DMs</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Clients</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.weekly.length ? (
                data.weekly.map((week) => (
                  <TableRow key={week.week}>
                    <TableCell>{week.week}</TableCell>
                    <TableCell className="text-right tabular-nums">{week.dms}</TableCell>
                    <TableCell className="text-right tabular-nums">{week.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{week.clients}</TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyRow colSpan={4} text="No analytics rows logged yet." />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
