"use client";

import { AppProvider } from "@/lib/AppContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
