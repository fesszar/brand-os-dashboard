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
import type { ScriptEntry } from "@/lib/types";

import { formatSlot } from "@/components/brand/utils";

type BrandScriptsTabProps = {
  scripts: ScriptEntry[];
  busy: boolean;
  onDelete: (slotDir: string) => void;
};

export function BrandScriptsTab({ scripts, busy, onDelete }: BrandScriptsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Scripts</CardTitle>
        <CardDescription>Track script status and clean old script entries</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Short Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hook</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scripts.length ? (
              scripts.map((script) => (
                <TableRow key={script.slotDir}>
                  <TableCell>{script.shortCode}</TableCell>
                  <TableCell>{script.date}</TableCell>
                  <TableCell>{formatSlot(script.slot)}</TableCell>
                  <TableCell>
                    <StatusBadge status={script.status} />
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate text-slate-300">
                    {script.hook || script.angleName || script.angleId || "n/a"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete script ${script.slotDir}?`);
                        if (confirmed) {
                          onDelete(script.slotDir);
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
                <TableCell colSpan={6} className="text-center text-slate-400">
                  No scripts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
