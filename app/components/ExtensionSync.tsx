"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/app/lib/api";

export default function ExtensionSync() {
  const { status } = useSession();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // Only attempt sync if authenticated and we haven't successfully synced yet this session
    if (status !== "authenticated" || synced) return;

    let syncAttempted = false;

    const syncToken = async () => {
      try {
        if (syncAttempted) return;
        syncAttempted = true;
        
        const res = await api.getTokens();
        if (res.tokens && res.tokens.length > 0) {
          const token = res.tokens[0].token;
          
          // Send token to the securely injected content script (extension/content/blueops.js)
          window.postMessage({
            source: "BLUEOPS_WEB_APP",
            type: "SET_EXTENSION_TOKEN",
            token: token
          }, window.location.origin);
          
        }
      } catch (err) {
        console.error("Failed to sync token with extension", err);
      }
    };

    // Listen for extension confirming it received the token
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source === "BLUEOPS_EXTENSION" && event.data?.type === "TOKEN_SYNC_SUCCESS") {
        console.log("[BlueOps Web] Successfully synced API token with Chrome Extension!");
        setSynced(true);
      }
    };

    window.addEventListener("message", handleMessage);
    
    // Attempt sync immediately, but also wait a bit in case the content script is slightly delayed
    syncToken();
    const timeout = setTimeout(syncToken, 1500);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, [status, synced]);

  return null; // This component has no UI
}
