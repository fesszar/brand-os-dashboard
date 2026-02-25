import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DraftEntry } from "@/lib/types";

import { formatSlot } from "@/components/brand/utils";

type BrandDraftsTabProps = {
  drafts: DraftEntry[];
  busy: boolean;
  onEdit: (draft: DraftEntry) => void;
  onPublish: (slotDir: string) => void;
  onDelete: (slotDir: string) => void;
};

export function BrandDraftsTab({
  drafts,
  busy,
  onEdit,
  onPublish,
  onDelete,
}: BrandDraftsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drafts Queue</CardTitle>
        <CardDescription>Preview, edit captions, publish, or delete draft slots</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.length ? (
              drafts.map((draft) => (
                <TableRow key={draft.slotDir}>
                  <TableCell>{draft.date}</TableCell>
                  <TableCell>{formatSlot(draft.slot)}</TableCell>
                  <TableCell>
                    <StatusBadge status={draft.status} />
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate text-slate-300">
                    {draft.textPreview || draft.captions?.tiktok || "No preview"}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" onClick={() => onEdit(draft)} disabled={busy}>
                      Edit Captions
                    </Button>
                    <Button variant="outline" onClick={() => onPublish(draft.slotDir)} disabled={busy}>
                      Publish
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete draft ${draft.slotDir}?`);
                        if (confirmed) {
                          onDelete(draft.slotDir);
                        }
                      }}
                      disabled={busy}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400">
                  No drafts queued.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
