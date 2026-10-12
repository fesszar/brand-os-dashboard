import type { Notice } from "@/hooks/use-async-action";

export function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <div
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm ${
        notice.kind === "ok"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/40 bg-rose-500/10 text-rose-200"
      }`}
    >
      {notice.text}
    </div>
  );
}
