// Apply the saved DebugAI theme before first paint.
(() => {
  let theme = null;

  try {
    theme = localStorage.getItem("theme");
  } catch {
    // Fall back to the device preference when storage is unavailable.
  }

  if (theme !== "dark" && theme !== "light") {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  document.documentElement.setAttribute("data-theme", theme);

  // Set Chrome's supported page/browser UI color.
  const color = theme === "dark" ? "#050a07" : "#f3f7fb";
  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", color);
})();

