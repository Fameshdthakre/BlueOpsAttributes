"use client";

import { AppProvider } from "@/app/lib/AppContext";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppProvider>{children}</AppProvider>
    </SessionProvider>
  );
}
