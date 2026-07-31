// ============================================================
// background.js — BlueOps Enterprise Toolkit Service Worker
// ============================================================

const BLUEOPS_API_BASE = "https://blue-ops-attributes.vercel.app";

// --- Message Router ---
// Listens for messages from ALL content scripts (blueops.js, amazon-pdp.js, etc.)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ── 1. Save API token from the BlueOps web app ───────────────────────────
  if (request.type === "SAVE_TOKEN") {
    chrome.storage.local.set({ blueopsToken: request.token }, () => {
      if (chrome.runtime.lastError) {
        console.error("[BlueOps BG] Failed to save token:", chrome.runtime.lastError.message);
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        return;
      }
      console.log("[BlueOps BG] API token saved successfully.");
      sendResponse({ status: "success" });
    });
    return true; // Required: keeps the message channel open for async sendResponse
  }

  // ── 2. Start a scraping / automation task ────────────────────────────────
  if (request.type === "START_TASK") {
    const { taskType, sessionId, url } = request.taskDetails || {};
    console.log(`[BlueOps BG] START_TASK received | type: ${taskType} | session: ${sessionId}`);

    if (!url) {
      sendResponse({ status: "error", message: "No URL provided in taskDetails." });
      return true;
    }

    // Open the target Amazon page in a background tab (not focused)
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("[BlueOps BG] Failed to create tab:", chrome.runtime.lastError.message);
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        return;
      }
      if (!tab || !tab.id) {
        sendResponse({ status: "error", message: "Tab creation returned no ID." });
        return;
      }

      // Save task context so the content script on that tab knows what to do
      const taskKey = `task_tab_${tab.id}`;
      chrome.storage.local.set({
        [taskKey]: { taskType, sessionId, tabId: tab.id }
      });

      console.log(`[BlueOps BG] Opened background tab ${tab.id} for task: ${taskType}`);
      sendResponse({ status: "task_started", tabId: tab.id });
    });

    return true; // Required: keeps message channel open for async sendResponse
  }

  // ── 3. Receive scraped data back from an Amazon content script ────────────
  if (request.type === "SCRAPE_RESULT") {
    const { sessionId, asin, data } = request;
    console.log(`[BlueOps BG] SCRAPE_RESULT received | ASIN: ${asin} | session: ${sessionId}`);

    // Push scraped data to the BlueOps backend API
    chrome.storage.local.get(["blueopsToken"], async (items) => {
      if (!items.blueopsToken) {
        console.error("[BlueOps BG] No API token saved. Cannot push result.");
        return;
      }
      try {
        const res = await fetch(`${BLUEOPS_API_BASE}/api/extension/result`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-token": items.blueopsToken,
          },
          body: JSON.stringify({ sessionId, asin, data }),
        });
        if (!res.ok) {
          console.error("[BlueOps BG] Failed to push result:", await res.text());
        } else {
          console.log(`[BlueOps BG] Result pushed for ASIN: ${asin}`);
        }
      } catch (err) {
        console.error("[BlueOps BG] Network error pushing result:", err);
      }
    });

    // Close the tab after scraping
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id);
    }
    sendResponse({ status: "result_received" });
    return true;
  }
});
