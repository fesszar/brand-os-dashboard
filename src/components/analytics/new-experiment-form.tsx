"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type NewExperimentInput = { brandId: string; hypothesis: string; variants: string[] };

type NewExperimentFormProps = { brandIds: string[]; busy: boolean; onCreate: (input: NewExperimentInput) => Promise<boolean> };

export function NewExperimentForm({ brandIds, busy, onCreate }: NewExperimentFormProps) {
  const [brandId, setBrandId] = useState(brandIds[0] ?? "");
  const [hypothesis, setHypothesis] = useState("");
  const [variants, setVariants] = useState("control, variant_b");

  return (
    <Card>
      <CardHeader>
        <CardTitle>New experiment</CardTitle>
        <CardDescription>Appends a definition row to the brand&apos;s experiments.jsonl. The first variant is the control.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 md:grid-cols-[180px_1fr_220px_auto] md:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            const created = await onCreate({
              brandId,
              hypothesis,
              variants: variants.split(",").map((v) => v.trim()).filter(Boolean),
            });
            if (created) {
              setHypothesis("");
            }
          }}
        >
          <label className="space-y-1 text-xs text-slate-400">
            Brand
            <Select aria-label="Experiment brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              {brandIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Hypothesis
            <Input aria-label="Hypothesis" value={hypothesis} placeholder="Shorter hooks lift engagement" onChange={(e) => setHypothesis(e.target.value)} required minLength={5} />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Variants (comma separated)
            <Input aria-label="Variants" value={variants} onChange={(e) => setVariants(e.target.value)} required />
          </label>
          <Button type="submit" disabled={busy}>
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
