"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Avatar } from "./Avatar";
import { IdentifyDialog } from "./IdentifyDialog";
import { useCurrentUserId } from "@/lib/current-user-context";
import type { User } from "@/lib/types";

export function UserMenu({ users }: { users: User[] }) {
  const { currentUserId, signOut } = useCurrentUserId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  if (!currentUser) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
        >
          <UserRound size={14} />
          Sign in with email
        </button>
        <IdentifyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Avatar name={currentUser.name} color={currentUser.avatarColor} size={26} />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {currentUser.name.split(" ")[0]}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
            Signed in as
            <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {currentUser.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDialogOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <UserRound size={14} />
            Switch account
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}

      <IdentifyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
