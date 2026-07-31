// ============================================================
// content/seller-central.js — Injected into Seller Central
// ============================================================

console.log("[BlueOps Extension] Seller Central script ready.");

// Listen for commands from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXECUTE_SCRAPE") {
    const data = scrapePortalImages();
    sendResponse({ status: "ok", data });
  }
});

// ── Image Auditor: Scrape portal images from Seller Central ───────────────
const scrapePortalImages = () => {
  // Seller Central image selectors — will need to be verified against live SC DOM
  const images = Array.from(
    document.querySelectorAll(".sc-product-image img, img[id*='image']")
  ).map((img) => ({ src: img.src, alt: img.alt || "" })).filter((i) => i.src);

  return { portalImages: images, url: window.location.href };
};
