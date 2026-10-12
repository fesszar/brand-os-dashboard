"use client";

import { useMemo, useState } from "react";

import { ExperimentCard } from "@/components/analytics/experiment-card";
import { NewExperimentForm, type NewExperimentInput } from "@/components/analytics/new-experiment-form";
import { NoticeBanner } from "@/components/notice-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { Experiment } from "@/lib/experiments";
import { requestJson } from "@/lib/request-json";

type StatusFilter = "active" | "archived" | "all";

export function ExperimentsView({ experiments, brandIds }: { experiments: Experiment[]; brandIds: string[] }) {
  const { busyAction, isBusy, notice, setNotice, run } = useAsyncAction();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [brand, setBrand] = useState("");

  const visible = useMemo(
    () => experiments.filter((e) => (status === "all" || e.status === status) && (!brand || e.brandId === brand)),
    [experiments, status, brand],
  );

  async function create(input: NewExperimentInput) {
    let created = false;
    await run("create", async () => {
      await requestJson("/api/experiments", { method: "POST", body: JSON.stringify(input) });
      setNotice({ kind: "ok", text: `Experiment created for ${input.brandId}.` });
      setStatus("active");
      created = true;
    });
    return created;
  }

  const setExperimentStatus = (experiment: Experiment, next: "active" | "archived") =>
    run(`status-${experiment.brandId}-${experiment.id}`, async () => {
      await requestJson(`/api/experiments/${experiment.brandId}/${encodeURIComponent(experiment.id)}/status`, {
        method: "POST",
        body: JSON.stringify({ status: next }),
      });
      setNotice({ kind: "ok", text: `${next === "archived" ? "Archived" : "Restored"} "${experiment.hypothesis}".` });
    });

  return (
    <div className="space-y-4">
      <NoticeBanner notice={notice} />
      <NewExperimentForm brandIds={brandIds} busy={isBusy} onCreate={create} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs text-slate-400">
          Status
          <Select aria-label="Status filter" className="w-40" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </Select>
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          Brand
          <Select aria-label="Brand filter" className="w-48" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brandIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </Select>
        </label>
        <p className="pb-2 text-sm text-slate-400">
          {visible.length} of {experiments.length} experiments
        </p>
      </div>

      {visible.length ? (
        visible.map((experiment) => (
          <ExperimentCard
            key={`${experiment.brandId}-${experiment.id}`}
            experiment={experiment}
            busy={busyAction === `status-${experiment.brandId}-${experiment.id}`}
            onSetStatus={(next) => setExperimentStatus(experiment, next)}
          />
        ))
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">No experiments match these filters.</CardContent>
        </Card>
      )}
    </div>
  );
}
