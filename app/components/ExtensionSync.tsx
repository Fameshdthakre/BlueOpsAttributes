"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/app/lib/api";

// ── Extension Connection States ───────────────────────────────────────────
export type ExtensionStatus = "checking" | "connected" | "disconnected";

interface ExtensionContextValue {
  status: ExtensionStatus;
  lastSynced: Date | null;
  recheck: () => void;
}

const ExtensionContext = createContext<ExtensionContextValue>({
  status: "checking",
  lastSynced: null,
  recheck: () => {},
});

export const useExtension = () => useContext(ExtensionContext);

// ── Provider Component ────────────────────────────────────────────────────
export function ExtensionSyncProvider({ children }: { children: ReactNode }) {
  const { status: sessionStatus } = useSession();
  const [extStatus, setExtStatus] = useState<ExtensionStatus>("checking");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const ALLOWED_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

  const attemptSync = async () => {
    if (sessionStatus !== "authenticated") return;

    try {
      const res = await api.getTokens();
      if (!res.tokens || res.tokens.length === 0) {
        setExtStatus("disconnected");
        return;
      }
      const token = res.tokens[0].token;

      // Post token to the content script — if the extension is installed,
      // blueops.js will intercept this and reply with TOKEN_SYNC_SUCCESS
      window.postMessage(
        { source: "BLUEOPS_WEB_APP", type: "SET_EXTENSION_TOKEN", token },
        ALLOWED_ORIGIN
      );

      // Wait up to 2s for acknowledgement from extension
      // If no reply, mark as disconnected
      const timeout = setTimeout(() => {
        setExtStatus((prev) => (prev === "checking" ? "disconnected" : prev));
      }, 2000);

      return () => clearTimeout(timeout);
    } catch {
      setExtStatus("disconnected");
    }
  };

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    setExtStatus("checking");

    // Listen for extension reply
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== ALLOWED_ORIGIN) return;
      if (
        event.data?.source === "BLUEOPS_EXTENSION" &&
        event.data?.type === "TOKEN_SYNC_SUCCESS"
      ) {
        setExtStatus("connected");
        setLastSynced(new Date());
      }
    };

    window.addEventListener("message", handleMessage);

    // Try sync immediately + once after a delay
    attemptSync();
    const retry = setTimeout(attemptSync, 1500);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  return (
    <ExtensionContext.Provider
      value={{ status: extStatus, lastSynced, recheck: attemptSync }}
    >
      {children}
    </ExtensionContext.Provider>
  );
}
