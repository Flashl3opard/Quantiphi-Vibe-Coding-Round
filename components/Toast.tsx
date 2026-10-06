"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToast, type ToastItem, type ToastVariant } from "@/lib/toast-context";

const DURATION_MS = 5000;

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof AlertTriangle; card: string; icon_color: string; bar: string }
> = {
  warning: {
    icon: AlertTriangle,
    card: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100",
    icon_color: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  success: {
    icon: CheckCircle2,
    card: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100",
    icon_color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  info: {
    icon: Info,
    card: "border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    icon_color: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-500",
  },
};

export function Toast({ toast }: { toast: ToastItem }) {
  const { dismiss } = useToast();
  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      role="status"
      className={`relative w-80 overflow-hidden rounded-lg border p-3 pb-4 shadow-lg ${style.card}`}
    >
      <div className="flex items-start gap-2">
        <Icon size={18} className={`mt-0.5 shrink-0 ${style.icon_color}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="mt-0.5 text-xs opacity-90">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="rounded p-0.5 opacity-60 hover:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-black/10 dark:bg-white/10">
        <div
          className={`h-full ${style.bar}`}
          style={{ animation: `toast-progress ${DURATION_MS}ms linear forwards` }}
        />
      </div>
    </div>
  );
}
