"use client";

import { useState } from "react";
import { Copy, PowerOff } from "lucide-react";

import { NoticeBanner } from "@/components/notice-banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAsyncAction } from "@/hooks/use-async-action";
import { requestJson } from "@/lib/request-json";

type BrandCardActionsProps = { brandId: string; brandName: string; decommissioned: boolean };

/**
 * Clone and decommission controls for one brand card.
 */
export function BrandCardActions({ brandId, brandName, decommissioned }: BrandCardActionsProps) {
  const { isBusy, notice, setNotice, run } = useAsyncAction();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [newId, setNewId] = useState(`${brandId}_copy`);
  const [newName, setNewName] = useState(`${brandName} Clone`);

  const clone = () =>
    run("clone", async () => {
      await requestJson(`/api/brands/${brandId}/clone`, { method: "POST", body: JSON.stringify({ brandId: newId, name: newName }) });
      setCloneOpen(false);
      setNotice({ kind: "ok", text: `Cloned to ${newId}.` });
    });

  const decommission = () => {
    if (!window.confirm(`Decommission ${brandName}? Its cron jobs will be disabled.`)) {
      return;
    }
    run("decommission", async () => {
      const result = await requestJson<{ disabledCrons: unknown[] }>(`/api/brands/${brandId}/decommission`, { method: "POST" });
      setNotice({ kind: "ok", text: `${brandName} decommissioned; ${result.disabledCrons.length} cron job(s) disabled.` });
    });
  };

  return (
    <div className="w-full space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => setCloneOpen(true)} disabled={isBusy}>
          <Copy className="mr-1 h-3.5 w-3.5" /> Clone
        </Button>
        <Button variant="outline" size="sm" onClick={decommission} disabled={isBusy || decommissioned}>
          <PowerOff className="mr-1 h-3.5 w-3.5" /> Decommission
        </Button>
      </div>
      <NoticeBanner notice={cloneOpen ? null : notice} />

      <Dialog open={cloneOpen} onClose={() => setCloneOpen(false)} title={`Clone ${brandName}`}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            clone();
          }}
        >
          <NoticeBanner notice={notice} />
          <p className="text-sm text-slate-400">Copies the storybook and hook rotation. Analytics history is not copied.</p>
          <label className="block space-y-1 text-xs text-slate-400">
            New brand id
            <Input aria-label="New brand id" value={newId} pattern="[a-z0-9_]{2,40}" onChange={(e) => setNewId(e.target.value.toLowerCase())} required />
          </label>
          <label className="block space-y-1 text-xs text-slate-400">
            Display name
            <Input aria-label="Clone display name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={isBusy}>
              Clone Brand
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
