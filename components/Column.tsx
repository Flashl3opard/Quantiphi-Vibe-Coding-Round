"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { TaskCard } from "./TaskCard";
import type { TaskWithAssignee } from "@/lib/types";

const DOT_COLORS: Record<string, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-amber-500",
  DONE: "bg-emerald-500",
};

export function Column({
  id,
  label,
  tasks,
  dragDisabled,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  id: string;
  label: string;
  tasks: TaskWithAssignee[];
  dragDisabled: boolean;
  onAddTask: () => void;
  onEditTask: (task: TaskWithAssignee) => void;
  onDeleteTask: (task: TaskWithAssignee) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-full min-w-0 flex-col rounded-xl bg-slate-100 sm:w-80 dark:bg-slate-900/60">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={clsx("h-2 w-2 rounded-full", DOT_COLORS[id])} />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h2>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddTask}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={clsx(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-2 transition-colors",
          isOver && "bg-slate-200/60 dark:bg-slate-800/60"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dragDisabled={dragDisabled}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            No tasks
          </p>
        )}
      </div>
    </div>
  );
}
