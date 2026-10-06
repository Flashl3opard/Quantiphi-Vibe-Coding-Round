"use client";

import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import { Flame, Plus, ShieldCheck, X } from "lucide-react";
import { Avatar } from "./Avatar";
import type { MemberWithUser, TaskWithAssignee } from "@/lib/types";
import { WORKLOAD_LIMIT } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

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

  const { push } = useToast();
  const wasOverloadedRef = useRef<Map<string, boolean>>(new Map());

  // Announce every moment someone crosses the burnout threshold, including
  // on first load — if the board opens with someone already over the line,
  // that's exactly when you want to be told, not just on live transitions.
  useEffect(() => {
    const previous = wasOverloadedRef.current;
    const next = new Map<string, boolean>();

    for (const member of members) {
      const count = inProgressCountByUser.get(member.userId) ?? 0;
      const overloaded = count > WORKLOAD_LIMIT;
      next.set(member.userId, overloaded);

      const wasOverloaded = previous.get(member.userId) ?? false;
      if (overloaded && !wasOverloaded) {
        push({
          variant: "warning",
          title: "More workload",
          message: `${member.user.name} now has ${count} tasks in progress — over the healthy limit of ${WORKLOAD_LIMIT}.`,
        });
      } else if (!overloaded && wasOverloaded) {
        push({
          variant: "success",
          title: "Less workload",
          message: `${member.user.name} is down to ${count} tasks in progress — back to a healthy range.`,
        });
      }
    }

    wasOverloadedRef.current = next;
  }, [members, inProgressCountByUser, push]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Team workload
        </span>
        <button
          type="button"
          onClick={onAddMember}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
          aria-label="Add user to project"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {members.map((member) => {
          const count = inProgressCountByUser.get(member.userId) ?? 0;
          const overloaded = count > WORKLOAD_LIMIT;
          const isYou = member.userId === currentUserId;

          return (
            <div
              key={member.id}
              className={clsx(
                "group relative flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5",
                overloaded
                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
              )}
            >
              <Avatar
                name={member.user.name}
                color={member.user.avatarColor}
                pulse={overloaded}
                ring={isYou}
                size={28}
                title={`${member.user.name} — ${count} in progress${overloaded ? " (overloaded)" : ""}${isYou ? " (you)" : ""}`}
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
                  {member.user.name.split(" ")[0]}
                  {isYou && <span className="text-slate-400 dark:text-slate-500"> (you)</span>}
                </span>
                <span
                  className={clsx(
                    "flex items-center gap-1 text-[11px] font-medium",
                    overloaded
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {overloaded ? <Flame size={11} /> : <ShieldCheck size={11} />}
                  {count} in progress
                </span>
              </div>
              {canRemove && member.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => onRemoveMember(member.userId)}
                  className="absolute -top-1.5 -right-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
                  aria-label={`Remove ${member.user.name}`}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
