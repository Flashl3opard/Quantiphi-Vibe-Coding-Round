"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { STATUS_COLUMNS, PRIORITY_LABELS, type MemberWithUser, type TaskWithAssignee } from "@/lib/types";

export type TaskFormValues = {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assigneeId: string;
};

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
}

export function TaskDialog({
  open,
  onClose,
  task,
  defaultStatus,
  defaultAssigneeId,
  members,
  onSubmit,
  onDelete,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskWithAssignee | null;
  defaultStatus: string;
  defaultAssigneeId?: string | null;
  members: MemberWithUser[];
  onSubmit: (values: TaskFormValues) => void;
  onDelete?: () => void;
  submitting: boolean;
}) {
  // Mounted fresh each time the dialog opens (parent remounts via `key`),
  // so a lazy initializer is enough — no effect-based reset needed.
  const [values, setValues] = useState<TaskFormValues>(() => ({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "MEDIUM",
    status: task?.status ?? defaultStatus,
    dueDate: toDateInputValue(task?.dueDate),
    assigneeId: task?.assigneeId ?? defaultAssigneeId ?? "",
  }));

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!values.title.trim()) return;
          onSubmit(values);
        }}
      >
        <div>
          <label className={labelClass}>Title</label>
          <input
            autoFocus
            required
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className={fieldClass}
            placeholder="Task title"
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            rows={3}
            className={fieldClass}
            placeholder="Optional details"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Priority</label>
            <select
              value={values.priority}
              onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value }))}
              className={fieldClass}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={values.status}
              onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
              className={fieldClass}
            >
              {STATUS_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Due date</label>
            <input
              type="date"
              value={values.dueDate}
              onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Assignee</label>
            <select
              value={values.assigneeId}
              onChange={(e) => setValues((v) => ({ ...v, assigneeId: e.target.value }))}
              className={fieldClass}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {task && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
            >
              Delete task
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {task ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
