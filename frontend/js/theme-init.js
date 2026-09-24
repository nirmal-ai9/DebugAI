// Runs in <head> so the saved theme is applied before first paint (no flash).
(() => {
  let theme = null;

  try {
    theme = localStorage.getItem("theme");
  } catch {
    // Storage can be blocked (private mode, strict settings); fall back to the OS preference.
  }

  if (theme !== "dark" && theme !== "light") {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  document.documentElement.setAttribute("data-theme", theme);
})();
