const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const API_URL = LOCAL_HOSTS.includes(location.hostname)
  ? "http://localhost:8787"
  : "https://debugai-backend.nirmal-ai9.workers.dev";
const REQUEST_TIMEOUT_MS = 45000;

const form = document.querySelector(".debug-form");
const msg = document.querySelector(".submit-note");
const btn = document.querySelector(".submit-button");
const btnLabel = btn.querySelector(".submit-button-label");
const btnDefaultLabel = btnLabel.textContent;

function setStatus(text, state = "") {
  msg.textContent = text;
  msg.classList.toggle("submit-note--error", state === "error");
  msg.classList.toggle("submit-note--busy", state === "busy");
  msg.classList.toggle("dot", state === "busy");
}

function setLoading(isLoading) {
  btn.disabled = isLoading;
  btn.classList.toggle("is-loading", isLoading);
  btnLabel.textContent = isLoading ? "Finding the fix" : btnDefaultLabel;
}

function describeFailure(error) {
  if (error.name === "TimeoutError") return "The request timed out. Try again with less code.";
  // fetch() rejects with a TypeError when the network is unreachable
  if (error instanceof TypeError) return "Couldn't reach DebugAI. Check your connection and try again.";
  return error.message;
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const requirementsField = form.elements.requirements;
  const codeField = form.elements.code;
  const debugData = {
    requirements: requirementsField.value,
    code: codeField.value,
    error: form.elements.err.value
  };

  const emptyField = [requirementsField, codeField].find(field => !field.value.trim());
  if (emptyField) {
    setStatus("Requirements and code are required", "error");
    emptyField.focus();
    return;
  }

  setLoading(true);
  setStatus("Working on it", "busy");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(debugData),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    // The backend always sends a `message`, even on 400/502, so read the body before the status.
    const data = await response.json().catch(() => null);
    if (!data) {
      throw new Error(`Unexpected response from the server (${response.status}).`);
    }

    if (data.success === false || !data.result) {
      setStatus(data.message || "Invalid code or request", "error");
      return;
    }

    showResult(data);
    setStatus("Done");
  } catch (error) {
    console.error("Request failed:", error);
    setStatus(describeFailure(error), "error");
  } finally {
    setLoading(false);
  }
});

// Raw fix code, kept apart from the numbered markup so copy and preview stay clean.
let currentFixCode = "";

function renderCodeLines(codeElement, source) {
  const lines = source ? source.replace(/\n$/, "").split(/\r?\n/) : [];
  const fragment = document.createDocumentFragment();

  lines.forEach((text, index) => {
    const line = document.createElement("span");
    line.className = "code-line";

    const number = document.createElement("span");
    number.className = "line-num";
    number.textContent = index + 1;

    line.append(number, text);
    fragment.append(line);
  });

  codeElement.style.setProperty("--gutter-digits", String(lines.length).length);
  codeElement.replaceChildren(fragment);
}

function showResult(data) {
  const result = data.result;
  const results = document.getElementById("results");
  
  // Bug
  const bugType = results.querySelector(".bug-meta-item:nth-child(1) dd");
  const bugLine = results.querySelector(".bug-meta-item:nth-child(2) dd");
  const bugMessage = results.querySelector(".bug-message");

  // Why
  const why = results.querySelector(".result-card--why .result-prose");

  // Fix
  const fixExplanation =
    results.querySelector(".result-card--fix .result-prose");
  const fixCode =
    results.querySelector(".code-fix code");

  // Fill bug information
  if (result.bug) {
    bugType.textContent = result.bug.type;
    bugLine.textContent = result.bug.line ?? "Unknown";
    bugMessage.textContent = result.bug.message;
  } else {
    bugType.textContent = "No bug found";
    bugLine.textContent = "—";
    bugMessage.textContent = "No obvious bug was detected.";
  }

  // Fill why
  why.textContent = result.why ?? "";

  // Fill fix
  if (result.fix) {
    fixExplanation.textContent = result.fix.explanation;
    currentFixCode = result.fix.code ?? "";
  } else {
    fixExplanation.textContent = "No fix is required.";
    currentFixCode = "";
  }
  renderCodeLines(fixCode, currentFixCode);
  resetCodeWindow(currentFixCode);
  copyBtn.disabled = !currentFixCode;

  // Show results
  results.hidden = false;
  results.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));

  // Scroll smoothly to results
  results.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
 
const copyBtn = document.querySelector(".apply-fix-button");
const COPY_LABEL = copyBtn.textContent;

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

// Code window: Code / Preview toggle
const codeWindow = document.querySelector(".code-window");
const viewButtons = codeWindow.querySelectorAll(".view-toggle-option");
const previewButton = codeWindow.querySelector('[data-view="preview"]');
const codePanel = codeWindow.querySelector(".code-fix");
const previewFrame = codeWindow.querySelector(".code-preview");

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

  viewButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });

  codePanel.hidden = showPreview;
  previewFrame.hidden = !showPreview;
  previewFrame.style.height = "";
  previewFrame.srcdoc = showPreview ? currentFixCode + PREVIEW_REPORTER : "";
}

function resetCodeWindow(code) {
  previewButton.disabled = !HTML_PATTERN.test(code);
  setView("code");
}

viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
