// ============================================================
// content/blueops.js — Injected into the BlueOps Web App ONLY
// ============================================================

console.log("[BlueOps Extension] Injected into BlueOps Web App.");

const ALLOWED_ORIGIN = window.location.origin;

// ── 1. Listen for Web-Driven commands from the Next.js app ───────────────────
window.addEventListener("message", (event) => {
  // SECURITY: Strictly verify the message is from OUR web app, not any other tab/site
  if (event.origin !== ALLOWED_ORIGIN) return;
  if (!event.data || event.data.source !== "BLUEOPS_WEB_APP") return;

  // Command: Save API token silently
  if (event.data.type === "SET_EXTENSION_TOKEN") {
    chrome.runtime.sendMessage(
      { type: "SAVE_TOKEN", token: event.data.token },
      (response) => {
        if (chrome.runtime.lastError) {
          // Extension not installed or communication failed — silently ignore
          console.warn("[BlueOps Extension] Could not save token (extension may not be installed):", chrome.runtime.lastError.message);
          return;
        }
        if (response?.status === "success") {
          console.log("[BlueOps Extension] API token successfully synced with extension.");
          // Reply back to the web app with a secure, same-origin message
          window.postMessage({ source: "BLUEOPS_EXTENSION", type: "TOKEN_SYNC_SUCCESS" }, ALLOWED_ORIGIN);
        }
      }
    );
  }

  // Command: Trigger a scraping/automation task
  if (event.data.type === "START_TASK") {
    if (!event.data.taskDetails) return;
    chrome.runtime.sendMessage(
      { type: "START_TASK", taskDetails: event.data.taskDetails },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[BlueOps Extension] Could not start task:", chrome.runtime.lastError.message);
          return;
        }
        console.log("[BlueOps Extension] Task response:", response);
        // Forward task acknowledgement back to the web app
        window.postMessage({
          source: "BLUEOPS_EXTENSION",
          type: "TASK_ACK",
          payload: response
        }, ALLOWED_ORIGIN);
      }
    );
  }
});
