"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { NoticeBanner } from "@/components/notice-banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAsyncAction } from "@/hooks/use-async-action";
import { PLATFORM_SCHEMAS } from "@/lib/platform-settings-schema";
import { requestJson } from "@/lib/request-json";

/**
 * "Add brand" wizard: id, display name and platforms → storybook skeleton.
 */
export function AddBrandDialog() {
  const { isBusy, notice, setNotice, run } = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram"]);

  const submit = () =>
    run("create-brand", async () => {
      await requestJson("/api/brands", { method: "POST", body: JSON.stringify({ brandId, name, platforms }) });
      setOpen(false);
      setNotice({ kind: "ok", text: `Created brand ${brandId}. Fill in its storybook next.` });
      setBrandId("");
      setName("");
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add Brand
      </Button>
      <NoticeBanner notice={open ? null : notice} />

      <Dialog open={open} onClose={() => setOpen(false)} title="Add brand">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <NoticeBanner notice={notice} />
          <label className="block space-y-1 text-xs text-slate-400">
            Brand id
            <Input
              aria-label="Brand id"
              value={brandId}
              placeholder="new_brand"
              pattern="[a-z0-9_]{2,40}"
              title="2-40 lowercase letters, digits or underscores"
              onChange={(e) => setBrandId(e.target.value.toLowerCase())}
              required
            />
          </label>
          <label className="block space-y-1 text-xs text-slate-400">
            Display name
            <Input aria-label="Display name" value={name} placeholder="New Brand" onChange={(e) => setName(e.target.value)} required />
          </label>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-xs text-slate-400">Platforms</legend>
            {PLATFORM_SCHEMAS.map((schema) => (
              <label key={schema.platform} className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={platforms.includes(schema.platform)}
                  onChange={(e) =>
                    setPlatforms((current) =>
                      e.target.checked ? [...current, schema.platform] : current.filter((p) => p !== schema.platform),
                    )
                  }
                />
                {schema.label}
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end">
            <Button type="submit" disabled={isBusy}>
              Create Brand
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
