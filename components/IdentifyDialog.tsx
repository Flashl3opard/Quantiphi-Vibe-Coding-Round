"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { useIdentify } from "@/lib/hooks";
import { useCurrentUserId } from "@/lib/current-user-context";

export function IdentifyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const identify = useIdentify();
  const { setCurrentUserId } = useCurrentUserId();

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Who's working today?">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !email.trim()) return;
          identify.mutate(
            { name: name.trim(), email: email.trim() },
            {
              onSuccess: (user) => {
                setCurrentUserId(user.id);
                onClose();
              },
            }
          );
        }}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No password needed — just your name and email so the board can show tasks assigned to
          you. If that email already exists, you&apos;ll be signed back in as that person.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Name
          </label>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        {identify.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {identify.error instanceof Error ? identify.error.message : "Something went wrong"}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={identify.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </form>
    </Modal>
  );
}
