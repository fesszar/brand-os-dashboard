import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (normalized.includes("publish") || normalized === "ok" || normalized === "active") {
    return <Badge variant="success">{status}</Badge>;
  }

  if (normalized.includes("fail") || normalized.includes("error") || normalized === "decommissioned") {
    return <Badge variant="destructive">{status}</Badge>;
  }

  if (normalized.includes("pending") || normalized.includes("scheduled") || normalized === "inactive") {
    return <Badge variant="warning">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
