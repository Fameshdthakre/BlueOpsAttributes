// ============================================================
// background.js — BlueOps Enterprise Toolkit Service Worker
// ============================================================

const BLUEOPS_API_BASE = "http://localhost:3000";

// --- Job Engine Polling ---
chrome.alarms.create("pollJobs", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollJobs") {
    pollForNextJob();
  }
});

async function pollForNextJob() {
  chrome.storage.local.get(["blueopsToken"], async (items) => {
    if (!items.blueopsToken) return;
    try {
      const res = await fetch(`${BLUEOPS_API_BASE}/api/jobs/next`, {
        headers: { "x-api-token": items.blueopsToken }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.job) {
        startJob(data.job);
      }
    } catch (err) {
      console.error("[BlueOps BG] Polling error:", err);
    }
  });
}

function startJob(job) {
  const { task_type, payload, id } = job;
  console.log(`[BlueOps BG] Starting polled job | type: ${task_type} | job_id: ${id}`);
  
  const url = payload.url;
  if (!url) {
    reportProgress(id, { status: "error", message: "No URL provided" });
    return;
  }
  
  chrome.tabs.create({ url, active: false }, (tab) => {
    if (chrome.runtime.lastError) {
      reportProgress(id, { status: "error", message: chrome.runtime.lastError.message });
      return;
    }
    
    // The content script will fetch this based on tab.id
    const taskKey = `task_tab_${tab.id}`;
    chrome.storage.local.set({
      [taskKey]: { taskType: task_type, jobId: id, tabId: tab.id, payload: payload }
    });
  });
}

function reportProgress(jobId, progress) {
  chrome.storage.local.get(["blueopsToken"], async (items) => {
    try {
      await fetch(`${BLUEOPS_API_BASE}/api/jobs/${jobId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": items.blueopsToken || ""
        },
        body: JSON.stringify(progress)
      });
    } catch (e) {
      console.error("Progress report error:", e);
    }
  });
}

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

  if (request.type === "SCRAPE_RESULT") {
    const { sessionId, jobId, asin, data } = request;
    console.log(`[BlueOps BG] SCRAPE_RESULT received | ASIN: ${asin} | session: ${sessionId} | job: ${jobId}`);

    if (jobId) {
      // New Enterprise flow: post progress to job engine
      reportProgress(jobId, {
        asin,
        status: "complete",
        message: "Scraping completed successfully",
        data
      });
    } else {
      // Legacy flow
      chrome.storage.local.get(["blueopsToken"], async (items) => {
        if (!items.blueopsToken) return;
        try {
          const res = await fetch(`${BLUEOPS_API_BASE}/api/extension/result`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-token": items.blueopsToken,
            },
            body: JSON.stringify({ sessionId, asin, data }),
          });
          if (!res.ok) console.error("[BlueOps BG] Failed to push result:", await res.text());
        } catch (err) {
          console.error("[BlueOps BG] Network error:", err);
        }
      });
    }

    // Close the tab after scraping
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id);
    }
    sendResponse({ status: "result_received" });
    return true;
  }
});

// ── Handle Tab Loading to Trigger Scrape ──────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const taskKey = `task_tab_${tabId}`;
    chrome.storage.local.get([taskKey], (items) => {
      const taskContext = items[taskKey];
      if (taskContext) {
        console.log(`[BlueOps BG] Tab ${tabId} loaded, executing scrape for task:`, taskContext.taskType);
        
        // Let the content script know it should scrape
        chrome.tabs.sendMessage(tabId, { type: "EXECUTE_SCRAPE" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[BlueOps BG] Execute error:", chrome.runtime.lastError.message);
            if (taskContext.jobId) {
                reportProgress(taskContext.jobId, { status: "error", message: chrome.runtime.lastError.message });
            }
            return;
          }
          if (response && response.status === "ok") {
            const asinMatch = tab.url.match(/([A-Z0-9]{10})/);
            const asin = asinMatch ? asinMatch[1] : "UNKNOWN";
            
            // Re-use the existing message router by sending a message to ourselves
            chrome.runtime.sendMessage({
              type: "SCRAPE_RESULT",
              sessionId: taskContext.sessionId,
              jobId: taskContext.jobId,
              asin: asin,
              data: response.data
            });
          }
        });
      }
    });
  }
});
