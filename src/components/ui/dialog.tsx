"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={cn("w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950 p-5", className)}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-800 px-2 py-1 text-sm text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
