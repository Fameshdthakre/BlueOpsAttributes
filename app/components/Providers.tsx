"use client";

import { AppProvider } from "@/app/lib/AppContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
