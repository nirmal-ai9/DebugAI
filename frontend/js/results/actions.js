function flashCopyLabel(text) {
  copyBtn.textContent = text;
  setTimeout(() => {
    copyBtn.textContent = COPY_LABEL;
  }, 2000);
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentFixCode);
    flashCopyLabel("Copied!");
  } catch (error) {
    console.error("Copy failed:", error);
    flashCopyLabel("Copy failed");
  }
});

const downloadBtn = document.querySelector(".download-fix-button");

downloadBtn.addEventListener("click", () => {
  const name = submitted.filename || "code.txt";
  const dot = name.lastIndexOf(".");
  const fixedName = dot > 0 ? `${name.slice(0, dot)}.fixed${name.slice(dot)}` : `${name}.fixed`;

  const url = URL.createObjectURL(new Blob([currentFullCode], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fixedName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Code window: Code / Preview toggle
const codeWindow = document.querySelector(".code-window");
const viewButtons = codeWindow.querySelectorAll(".view-toggle-option");
const previewButton = codeWindow.querySelector('[data-view="preview"]');
const codePanel = codeWindow.querySelector(".code-fix");
const previewFrame = codeWindow.querySelector(".code-preview");
const diffPanel = codeWindow.querySelector(".code-diff");
const diffButton = codeWindow.querySelector('[data-view="diff"]');

// Requires a matching closing tag so plain JS comparisons (a < b) don't count as HTML.
const HTML_PATTERN = /<!doctype html|<([a-z][\w-]*)\b[^>]*>[\s\S]*<\/\1>/i;

// Sandboxed frames can't be measured from outside, so the page reports its own height.
const PREVIEW_HEIGHT_MESSAGE = "debugai-preview-height";
const PREVIEW_REPORTER = `<script>
  new ResizeObserver(() => parent.postMessage({
    type: "${PREVIEW_HEIGHT_MESSAGE}",
    height: document.documentElement.scrollHeight
  }, "*")).observe(document.documentElement);
<\/script>`;

window.addEventListener("message", event => {
  if (event.source !== previewFrame.contentWindow) return;
  if (event.data?.type !== PREVIEW_HEIGHT_MESSAGE) return;
  previewFrame.style.height = `${event.data.height}px`;
});

function setView(view) {
  const showPreview = view === "preview";
  const showDiff = view === "diff";

  viewButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });

  codePanel.hidden = showPreview || showDiff;
  if (diffPanel) diffPanel.hidden = !showDiff;
  previewFrame.hidden = !showPreview;
  previewFrame.style.height = "";
  previewFrame.srcdoc = showPreview ? currentFixCode + PREVIEW_REPORTER : "";
  if (showDiff) document.dispatchEvent(new CustomEvent("debugai:diff"));
}

function resetCodeWindow(code) {
  previewButton.disabled = !HTML_PATTERN.test(code.slice(0, 20000));
  if (diffButton) diffButton.disabled = !code;
  setView("code");
}

viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

window.DebugAI = {
  goToStep,
  clearUpload,
  restore({ data, code, filename, requirements, error }) {
    submitted = { code, filename, requirements, error };
    showResult(data, { restored: true });
  }
};
