"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode } from "react";

export function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/welcome" || pathname === "/login" || pathname === "/signup";

  if (isAuthRoute) {
    return (
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-bg-dark">
        {children}
      </main>
    );
  }

  return (
    <>
      <Topbar />
      <div className="flex flex-1 overflow-hidden bg-bg-card">
        <Sidebar />
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative bg-bg-dark rounded-tl-2xl border-t border-l border-bg-input">
          {children}
        </main>
      </div>
    </>
  );
}
