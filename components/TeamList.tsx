"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { Avatar } from "./Avatar";
import type { MemberWithUser, TaskWithAssignee } from "@/lib/types";
import { WORKLOAD_LIMIT } from "@/lib/types";

export function TeamList({
  members,
  tasks,
  currentUserId,
  onAddMember,
  onRemoveMember,
  canRemove,
}: {
  members: MemberWithUser[];
  tasks: TaskWithAssignee[];
  currentUserId?: string | null;
  onAddMember: () => void;
  onRemoveMember: (userId: string) => void;
  canRemove: boolean;
}) {
  const inProgressCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (task.status !== "IN_PROGRESS" || !task.assigneeId) continue;
      counts.set(task.assigneeId, (counts.get(task.assigneeId) ?? 0) + 1);
    }
    return counts;
  }, [tasks]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Team</span>
      <div className="flex flex-wrap items-center gap-2">
        {members.map((member) => {
          const count = inProgressCountByUser.get(member.userId) ?? 0;
          const overloaded = count > WORKLOAD_LIMIT;
          const isYou = member.userId === currentUserId;
          return (
            <div key={member.id} className="group relative">
              <Avatar
                name={member.user.name}
                color={member.user.avatarColor}
                pulse={overloaded}
                ring={isYou}
                title={`${member.user.name} — ${count} in progress${overloaded ? " (overloaded)" : ""}${isYou ? " (you)" : ""}`}
              />
              <span
                className={clsx(
                  "absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white px-0.5 text-[10px] font-bold text-white dark:border-slate-900",
                  overloaded ? "bg-red-600" : "bg-slate-400 dark:bg-slate-600"
                )}
              >
                {count}
              </span>
              {canRemove && member.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => onRemoveMember(member.userId)}
                  className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] text-white group-hover:flex"
                  aria-label={`Remove ${member.user.name}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onAddMember}
        className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
        aria-label="Add user to project"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
