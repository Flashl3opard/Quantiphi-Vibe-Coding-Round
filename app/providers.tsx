"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CurrentUserProvider } from "@/lib/current-user-context";
import { ToastProvider } from "@/lib/toast-context";
import { ToastStack } from "@/components/ToastStack";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <CurrentUserProvider>
          {children}
          <ToastStack />
        </CurrentUserProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
