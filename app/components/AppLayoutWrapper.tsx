"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";
import ExtensionSync from "./ExtensionSync";

export function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const isAuthRoute = pathname === "/" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (status === "unauthenticated" && !isAuthRoute) {
      router.replace("/login");
    } else if (status === "authenticated" && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
      router.replace("/dashboard");
    }
  }, [status, isAuthRoute, pathname, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-muted">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (status === "unauthenticated" && !isAuthRoute) {
    return null; // prevent flash of protected content before redirect
  }

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
          <ExtensionSync />
          {children}
        </main>
      </div>
    </>
  );
}
