"use client";

import clsx from "clsx";
import { PRIORITY_LABELS } from "@/lib/types";

const OPTIONS = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function PriorityFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === option
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
        >
          {option === "ALL" ? "All" : PRIORITY_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
