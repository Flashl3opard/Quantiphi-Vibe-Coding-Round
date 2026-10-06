"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "taskboard:userId";
const USER_EVENT = "taskboard-user-change";

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(callback: () => void) {
  window.addEventListener(USER_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(USER_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

type CurrentUserContextValue = {
  currentUserId: string | null;
  setCurrentUserId: (id: string) => void;
  signOut: () => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const currentUserId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setCurrentUserId(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(USER_EVENT));
  }

  function signOut() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(USER_EVENT));
  }

  return (
    <CurrentUserContext.Provider value={{ currentUserId, setCurrentUserId, signOut }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUserId() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUserId must be used within CurrentUserProvider");
  return ctx;
}
