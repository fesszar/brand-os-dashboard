import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UploadEntry } from "@/lib/types";

type BrandUploadsTabProps = {
  uploads: UploadEntry[];
  busy: boolean;
  uploadFiles: FileList | null;
  onSelectFiles: (files: FileList | null) => void;
  onUpload: () => void;
  onMarkPosted: (fileName: string) => void;
  onMarkPublished: (fileName: string) => void;
  onDelete: (fileName: string) => void;
};

export function BrandUploadsTab({
  uploads,
  busy,
  uploadFiles,
  onSelectFiles,
  onUpload,
  onMarkPosted,
  onMarkPublished,
  onDelete,
}: BrandUploadsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Center</CardTitle>
          <CardDescription>Upload video files and track processing state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            multiple
            accept=".mp4,.mov,.m4v,.webm"
            onChange={(event) => onSelectFiles(event.target.files)}
          />
          <Button onClick={onUpload} disabled={busy || !uploadFiles?.length}>
            Upload Selected Files
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploads</CardTitle>
          <CardDescription>Pending, posted, and published upload assets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length ? (
                uploads.map((upload) => (
                  <TableRow key={`${upload.status}-${upload.filename}`}>
                    <TableCell className="max-w-[320px] truncate">{upload.filename}</TableCell>
                    <TableCell>
                      <StatusBadge status={upload.status} />
                    </TableCell>
                    <TableCell>{new Date(upload.uploadedAt).toLocaleString()}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        onClick={() => onMarkPosted(upload.filename)}
                        disabled={busy || upload.status === "posted"}
                      >
                        Mark Posted
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onMarkPublished(upload.filename)}
                        disabled={busy || upload.status === "published"}
                      >
                        Mark Published
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete upload ${upload.filename}?`,
                          );
                          if (confirmed) {
                            onDelete(upload.filename);
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
                  <TableCell colSpan={4} className="text-center text-slate-400">
                    No uploads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
