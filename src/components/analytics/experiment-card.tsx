import { compactNumber, percent } from "@/components/charts/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Experiment } from "@/lib/experiments";

type ExperimentCardProps = { experiment: Experiment; busy: boolean; onSetStatus: (status: "active" | "archived") => void };

export function ExperimentCard({ experiment, busy, onSetStatus }: ExperimentCardProps) {
  const archived = experiment.status === "archived";

  return (
    <Card data-testid={`experiment-${experiment.id}`}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{experiment.brandId}</Badge>
            <Badge variant={archived ? "default" : "success"}>{experiment.status}</Badge>
            {experiment.winner ? <Badge variant="success">Winner: {experiment.winner}</Badge> : null}
          </div>
          <CardTitle className="text-base">{experiment.hypothesis}</CardTitle>
          <CardDescription>
            Metric: {experiment.metric} · started {experiment.createdAt ? new Date(experiment.createdAt).toLocaleDateString() : "unknown"}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onSetStatus(archived ? "active" : "archived")}>
          {archived ? "Restore" : "Archive"}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Eng. rate</TableHead>
              <TableHead className="text-right">Lift vs control</TableHead>
              <TableHead className="text-right">p-value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {experiment.variants.map((variant, index) => (
              <TableRow key={variant.variant}>
                <TableCell>
                  {variant.variant}
                  {index === 0 ? <span className="ml-2 text-xs text-slate-500">control</span> : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{variant.posts}</TableCell>
                <TableCell className="text-right tabular-nums">{compactNumber(variant.views)}</TableCell>
                <TableCell className="text-right tabular-nums">{variant.views || variant.posts ? percent(variant.engagementRate, 2) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {variant.lift === null ? "—" : `${variant.lift >= 0 ? "+" : ""}${percent(variant.lift)}`}
                </TableCell>
                <TableCell className="text-right">
                  {variant.pValue === null ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      {variant.pValue < 0.001 ? "<0.001" : variant.pValue.toFixed(3)}
                      <Badge variant={variant.significant ? "success" : "outline"}>{variant.significant ? "significant" : "not yet"}</Badge>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {experiment.variants.every((v) => v.views === 0) ? (
          <p className="mt-2 text-xs text-slate-500">No results logged yet. Rows with this experiment_id and a variant field will appear here.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
