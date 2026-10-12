"use client";

import { useState } from "react";

import { BrandCalendarTab } from "@/components/brand/brand-calendar-tab";
import { BrandDraftsTab } from "@/components/brand/brand-drafts-tab";
import { BrandOverviewTab } from "@/components/brand/brand-overview-tab";
import { BrandScriptsTab } from "@/components/brand/brand-scripts-tab";
import { BrandUploadsTab } from "@/components/brand/brand-uploads-tab";
import type { BrandCalendarItem } from "@/components/brand/types";
import { NoticeBanner } from "@/components/notice-banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import { requestJson } from "@/lib/request-json";
import type { DraftEntry, PublishEntry, ScriptEntry, UploadEntry } from "@/lib/types";

type BrandWorkspaceTabsProps = {
  brandId: string;
  brandName: string;
  category?: string;
  status: string;
  drafts: DraftEntry[];
  scripts: ScriptEntry[];
  uploads: UploadEntry[];
  calendarItems: BrandCalendarItem[];
  publishHistory: PublishEntry[];
  integrations: Record<string, string>;
};

export function BrandWorkspaceTabs({
  brandId,
  brandName,
  category,
  status,
  drafts,
  scripts,
  uploads,
  calendarItems,
  publishHistory,
  integrations,
}: BrandWorkspaceTabsProps) {
  const { isBusy, notice, setNotice, run: runAction } = useAsyncAction();
  const [editingDraft, setEditingDraft] = useState<DraftEntry | null>(null);
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  const publishedCount = publishHistory.filter((entry) => entry.ok).length;

  /**
   * Opens draft caption editor with current caption values.
   */
  function startDraftEdit(draft: DraftEntry) {
    const nextCaptions = draft.captions && Object.keys(draft.captions).length
      ? { ...draft.captions }
      : { tiktok: draft.textPreview || "" };

    setEditingDraft(draft);
    setCaptionDraft(nextCaptions);
  }

  /**
   * Persists edited captions back to the draft endpoint.
   */
  async function saveDraftCaptions() {
    if (!editingDraft) {
      return;
    }

    const slotDir = editingDraft.slotDir;

    await runAction(`caption-${slotDir}`, async () => {
      await requestJson(`/api/drafts/${brandId}/${slotDir}`, {
        method: "PATCH",
        body: JSON.stringify({ captions: captionDraft }),
      });

      setEditingDraft(null);
      setNotice({ kind: "ok", text: `Captions updated for ${slotDir}.` });
    });
  }

  /**
   * Uploads selected video files to the brand upload endpoint.
   */
  async function uploadSelectedFiles() {
    if (!uploadFiles?.length) {
      setNotice({ kind: "error", text: "Choose at least one file before uploading." });
      return;
    }

    const selectedCount = uploadFiles.length;

    await runAction("upload-files", async () => {
      const form = new FormData();
      for (const file of Array.from(uploadFiles)) {
        form.append("files", file);
      }

      await requestJson(`/api/uploads/${brandId}`, {
        method: "POST",
        body: form,
      });

      setUploadFiles(null);
      setNotice({ kind: "ok", text: `Uploaded ${selectedCount} file(s).` });
    });
  }

  return (
    <div className="space-y-4">
      <NoticeBanner notice={notice} />

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="drafts">Drafts Queue</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BrandOverviewTab
            brandName={brandName}
            category={category}
            status={status}
            draftCount={drafts.length}
            scriptCount={scripts.length}
            publishedCount={publishedCount}
            integrations={integrations}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <BrandCalendarTab items={calendarItems} />
        </TabsContent>

        <TabsContent value="drafts">
          <BrandDraftsTab
            drafts={drafts}
            busy={isBusy}
            onEdit={startDraftEdit}
            onPublish={(slotDir) =>
              runAction(`publish-${slotDir}`, async () => {
                await requestJson(`/api/drafts/${brandId}/publish`, {
                  method: "POST",
                  body: JSON.stringify({ slotDir }),
                });
                setNotice({ kind: "ok", text: `Publish trigger sent for ${slotDir}.` });
              })
            }
            onDelete={(slotDir) =>
              runAction(`delete-draft-${slotDir}`, async () => {
                await requestJson(`/api/drafts/${brandId}/${slotDir}`, { method: "DELETE" });
                setNotice({ kind: "ok", text: `Deleted draft ${slotDir}.` });
              })
            }
          />
        </TabsContent>

        <TabsContent value="scripts">
          <BrandScriptsTab
            scripts={scripts}
            busy={isBusy}
            onDelete={(slotDir) =>
              runAction(`delete-script-${slotDir}`, async () => {
                await requestJson(`/api/scripts/${brandId}/${slotDir}`, { method: "DELETE" });
                setNotice({ kind: "ok", text: `Deleted script ${slotDir}.` });
              })
            }
          />
        </TabsContent>

        <TabsContent value="uploads">
          <BrandUploadsTab
            uploads={uploads}
            busy={isBusy}
            uploadFiles={uploadFiles}
            onSelectFiles={setUploadFiles}
            onUpload={uploadSelectedFiles}
            onMarkPosted={(fileName) =>
              runAction(`status-posted-${fileName}`, async () => {
                await requestJson(`/api/uploads/${brandId}/${encodeURIComponent(fileName)}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "posted" }),
                });
                setNotice({ kind: "ok", text: `${fileName} marked posted.` });
              })
            }
            onMarkPublished={(fileName) =>
              runAction(`status-published-${fileName}`, async () => {
                await requestJson(`/api/uploads/${brandId}/${encodeURIComponent(fileName)}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "published" }),
                });
                setNotice({ kind: "ok", text: `${fileName} marked published.` });
              })
            }
            onDelete={(fileName) =>
              runAction(`delete-upload-${fileName}`, async () => {
                await requestJson(`/api/uploads/${brandId}/${encodeURIComponent(fileName)}`, {
                  method: "DELETE",
                });
                setNotice({ kind: "ok", text: `Deleted upload ${fileName}.` });
              })
            }
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(editingDraft)}
        onClose={() => setEditingDraft(null)}
        title={editingDraft ? `Edit Captions · ${editingDraft.slotDir}` : "Edit Captions"}
        className="max-w-2xl"
      >
        <div className="space-y-3">
          {Object.entries(captionDraft).map(([platform, text]) => (
            <label key={platform} className="block space-y-1">
              <span className="text-sm font-medium capitalize text-slate-300">{platform}</span>
              <Textarea
                rows={3}
                value={text}
                onChange={(event) =>
                  setCaptionDraft((current) => ({
                    ...current,
                    [platform]: event.target.value,
                  }))
                }
              />
            </label>
          ))}

          <div className="flex justify-end">
            <Button onClick={saveDraftCaptions} disabled={isBusy}>
              Save Captions
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
