// Service worker for BlueOps Enterprise Toolkit

// Listen for messages from content scripts (especially our blueops.js web app script)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SAVE_TOKEN") {
    // Save token to extension local storage
    chrome.storage.local.set({ blueopsToken: request.token }, () => {
      console.log("[BlueOps Extension] Token securely saved to local storage.");
      sendResponse({ status: "success" });
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === "START_TASK") {
    console.log("[BlueOps Extension] Received START_TASK command:", request.taskDetails);
    
    // Example: Opening an Amazon tab based on the task
    const url = request.taskDetails.url || "https://www.amazon.com";
    
    chrome.tabs.create({ url, active: false }, (tab) => {
      // Store state that this tab is managed by a specific task
      if (tab.id) {
        chrome.storage.local.set({ 
          [`task_${tab.id}`]: request.taskDetails 
        });
      }
    });

    sendResponse({ status: "task_started" });
    return true;
  }
});
