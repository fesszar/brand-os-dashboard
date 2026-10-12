"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Notice = { kind: "ok" | "error"; text: string };

/**
 * Shared busy/notice/refresh handling for client-side mutations. `run` clears
 * the notice, executes the task, refreshes server data and surfaces errors.
 */
export function useAsyncAction() {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function run(actionId: string, task: () => Promise<void>) {
    setBusyAction(actionId);
    setNotice(null);

    try {
      await task();
      router.refresh();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Request failed" });
    } finally {
      setBusyAction(null);
    }
  }

  return { busyAction, isBusy: busyAction !== null, notice, setNotice, run };
}
