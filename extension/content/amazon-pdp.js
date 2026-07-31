// ============================================================
// content/amazon-pdp.js — Injected into Amazon Consumer Pages
// (e.g. amazon.com/dp/B0XXXXXXX)
// ============================================================

// Read task context set by background.js for this tab
chrome.storage.local.get([`task_tab_${chrome.runtime.id}`], (items) => {
  // This is a skeleton — actual task matching happens via tab ID stored in background
  // The background.js stores task context with key `task_tab_<tabId>`
  // Content scripts don't directly know their own tab ID, so we listen for a command instead
});

// Listen for a direct command from background.js via chrome.runtime.onMessage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXECUTE_SCRAPE") {
    const data = scrapeListingData();
    sendResponse({ status: "ok", data });
  }
});

// ── Listing Auditor Scraper ────────────────────────────────────────────────
const scrapeListingData = () => {
  const title = document.getElementById("productTitle")?.innerText?.trim() || null;
  const price = document.querySelector(".a-price .a-offscreen")?.textContent?.trim() || null;
  const brand = document.getElementById("bylineInfo")?.innerText?.trim() || null;

  // Bullet points
  const bullets = Array.from(
    document.querySelectorAll("#feature-bullets li span.a-list-item")
  ).map((li) => li.textContent.trim()).filter(Boolean);

  // Product description
  const description = document.getElementById("productDescription")?.innerText?.trim() || null;

  // Main image carousel
  const images = Array.from(
    document.querySelectorAll("#altImages img")
  ).map((img) => img.src.replace(/\._.*_\./, ".")).filter(Boolean);

  return { title, price, brand, bullets, description, images };
};
