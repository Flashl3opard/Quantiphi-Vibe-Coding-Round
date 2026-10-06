"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import type { MemberWithUser, User } from "@/lib/types";

const fieldClass =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function AddMemberDialog({
  open,
  onClose,
  users,
  members,
  onAddExisting,
  onCreateAndAdd,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  users: User[];
  members: MemberWithUser[];
  onAddExisting: (userId: string) => void;
  onCreateAndAdd: (data: { name: string; email: string }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const availableUsers = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.userId));
    return users.filter((u) => !memberIds.has(u.id));
  }, [users, members]);

  return (
    <Modal open={open} onClose={onClose} title="Add user to project">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Existing users
          </p>
          {availableUsers.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Everyone is already on this project.
            </p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {availableUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="text-sm text-slate-800 dark:text-slate-200">
                    {u.name}{" "}
                    <span className="text-slate-400 dark:text-slate-500">({u.email})</span>
                  </span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => onAddExisting(u.id)}
                    className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Or create a new user
          </p>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !email.trim()) return;
              onCreateAndAdd({ name: name.trim(), email: email.trim() });
              setName("");
              setEmail("");
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={fieldClass}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className={fieldClass}
            />
            <button
              type="submit"
              disabled={submitting}
              className="self-end rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Create & add
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
