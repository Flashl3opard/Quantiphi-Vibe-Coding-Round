"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { X } from "lucide-react";
import { Avatar } from "./Avatar";
import { PRIORITY_LABELS, type TaskWithAssignee } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatDueDate(dueDate: string | Date) {
  // Pin an explicit locale: `undefined` resolves to the server's locale
  // during SSR and the browser's locale on the client, which can differ
  // and causes a hydration mismatch.
  const date = new Date(dueDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskCard({
  task,
  dragDisabled,
  onEdit,
  onDelete,
}: {
  task: TaskWithAssignee;
  dragDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: dragDisabled });

  const isOverdue =
    task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onEdit}
      className={clsx(
        "group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        isDragging && "opacity-50",
        dragDisabled && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={clsx(
            "rounded px-1.5 py-0.5 text-[11px] font-semibold",
            PRIORITY_STYLES[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="hidden h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-red-600 group-hover:flex dark:hover:bg-slate-800 dark:hover:text-red-400"
          aria-label="Delete task"
        >
          <X size={12} />
        </button>
      </div>

      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        {task.dueDate ? (
          <span
            className={clsx(
              "text-[11px] font-medium",
              isOverdue ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            Due {formatDueDate(task.dueDate)}
          </span>
        ) : (
          <span />
        )}
        {task.assignee && (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size={24} />
        )}
      </div>
    </div>
  );
}
