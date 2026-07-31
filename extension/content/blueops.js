// Content script injected ONLY into the BlueOps Web App (e.g. blue-ops-attributes.vercel.app)

console.log("[BlueOps Extension] Content script loaded on BlueOps Web App.");

// 1. Silent Authentication (Token Capture)
// Wait for the DOM to be ready, then look for the token in localStorage
const captureToken = () => {
  // Assuming the web app saves the token in localStorage under a specific key, 
  // or maybe it's in a cookie. For now, we will look for a generic "blueops_token" or similar,
  // or we wait for the web app to postMessage it.
  // We'll rely on postMessage as it's the safest way for the Next.js app to explicitly hand it over.
};

captureToken();

// 2. Listen for Web-Driven commands from the Next.js app
window.addEventListener("message", (event) => {
  // SECURITY: Only accept messages from the same origin (our web app)
  if (event.origin !== window.location.origin) return;

  // The web app should send messages with a specific source to identify them
  if (event.data && event.data.source === "BLUEOPS_WEB_APP") {
    
    // Command: Save Token
    if (event.data.type === "SET_EXTENSION_TOKEN") {
      chrome.runtime.sendMessage(
        { type: "SAVE_TOKEN", token: event.data.token },
        (response) => {
          if (response?.status === "success") {
            console.log("[BlueOps Extension] Token sync complete.");
            // Optionally, tell the web app it was successful
            window.postMessage({ source: "BLUEOPS_EXTENSION", type: "TOKEN_SYNC_SUCCESS" }, "*");
          }
        }
      );
    }

    // Command: Start Task
    if (event.data.type === "START_TASK") {
      chrome.runtime.sendMessage(
        { type: "START_TASK", taskDetails: event.data.taskDetails },
        (response) => {
          console.log("[BlueOps Extension] Task started response:", response);
        }
      );
    }
  }
});
