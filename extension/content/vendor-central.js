// ============================================================
// content/vendor-central.js — Injected into Vendor Central
// ============================================================

console.log("[BlueOps Extension] Vendor Central script ready.");

// Listen for commands from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXECUTE_SCRAPE") {
    const data = scrapePortalImages();
    sendResponse({ status: "ok", data });
  }
});

// ── Image Auditor: Scrape portal images from Vendor Central ───────────────
const scrapePortalImages = () => {
  // Vendor Central image tables — selectors will need to be verified against live VC DOM
  const images = Array.from(
    document.querySelectorAll("img[data-image-type], .product-image img")
  ).map((img) => ({ src: img.src, alt: img.alt || "" })).filter((i) => i.src);

  return { portalImages: images, url: window.location.href };
};
