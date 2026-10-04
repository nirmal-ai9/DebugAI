const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const API_URL = LOCAL_HOSTS.includes(location.hostname)
  ? "http://localhost:8787"
  : "https://debugai-backend.nirmal-ai9.workers.dev";
const REQUEST_TIMEOUT_MS = 90000;

// Keep in sync with LIMITS in backend/src/index.js
const FIELD_LIMITS = { requirements: 4000, code: 120000, err: 8000 };
const MAX_UPLOAD_BYTES = 600 * 1024;
const BLOCKED_EXTENSIONS = /\.(zip|rar|7z|tar|gz|tgz|bz2|xz|png|jpe?g|gif|webp|bmp|ico|svgz|pdf|docx?|xlsx?|pptx?|exe|dll|so|bin|class|jar|mp[34]|mov|avi|wav|woff2?|ttf|otf)$/i;

const form = document.querySelector(".debug-form");
const msg = document.querySelector(".submit-note");
const btn = document.querySelector(".submit-button");
const btnLabel = btn.querySelector(".submit-button-label");
const btnDefaultLabel = btnLabel.textContent;

// Wizard: one question at a time
const steps = [...form.querySelectorAll(".wizard-step")];
const tabs = [...form.querySelectorAll(".wizard-step-tab")];
const nextBtn = form.querySelector(".wizard-next");
const backBtn = form.querySelector(".wizard-back");
const countEl = form.querySelector(".wizard-count");
const barEl = form.querySelector(".wizard-bar span");
const HINT = "Ctrl + Enter to continue";
const REQUIRED_STEPS = [0, 1];
let current = 0;
let submitted = { code: "", filename: "" };

function stepField(index) {
  return steps[index].querySelector("textarea");
}

function stepError(index, text = "") {
  const field = stepField(index);
  steps[index].querySelector(".field-error").textContent = text;
  if (text) field.setAttribute("aria-invalid", "true");
  else field.removeAttribute("aria-invalid");
}

function validateStep(index) {
  const field = stepField(index);
  const limit = FIELD_LIMITS[field.name];

  if (field.value.length > limit) {
    stepError(index, `Too long: ${field.value.length.toLocaleString()} characters (max ${limit.toLocaleString()}).`);
    return false;
  }
  if (REQUIRED_STEPS.includes(index) && !field.value.trim()) {
    stepError(index, index === 0 ? "Tell us what it should do." : "Add the code to debug.");
    return false;
  }
  stepError(index);
  return true;
}

function goToStep(index, { focus = true } = {}) {
  current = Math.max(0, Math.min(steps.length - 1, index));
  const last = current === steps.length - 1;

  steps.forEach((step, i) => { step.hidden = i !== current; });
  tabs.forEach((tab, i) => {
    tab.classList.toggle("is-active", i === current);
    tab.classList.toggle("is-done", i < current);
    tab.toggleAttribute("aria-current", i === current);
    if (i !== current) tab.removeAttribute("aria-current");
  });

  countEl.textContent = `Step ${current + 1} of ${steps.length}`;
  barEl.style.width = `${((current + 1) / steps.length) * 100}%`;
  backBtn.hidden = current === 0;
  nextBtn.hidden = last;
  btn.hidden = !last;
  setStatus(last ? "Ctrl + Enter to submit" : HINT);

  if (focus) stepField(current).focus({ preventScroll: true });
}

function advance() {
  if (!validateStep(current)) {
    stepField(current).focus();
    return;
  }
  goToStep(current + 1);
}

nextBtn.addEventListener("click", advance);
backBtn.addEventListener("click", () => goToStep(current - 1));

tabs.forEach((tab, target) => {
  tab.addEventListener("click", () => {
    for (let i = current; i < target; i++) {
      if (!validateStep(i)) {
        goToStep(i);
        return;
      }
    }
    goToStep(target);
  });
});

function updateCount(index) {
  const field = stepField(index);
  const limit = FIELD_LIMITS[field.name];
  steps[index].querySelector(".field-count").textContent =
    `${field.value.length.toLocaleString()} / ${limit.toLocaleString()}`;
}

steps.forEach((step, index) => {
  const field = stepField(index);
  updateCount(index);
  field.addEventListener("input", () => {
    updateCount(index);
    if (field.value.trim()) stepError(index);
  });
  field.addEventListener("keydown", event => {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (current === steps.length - 1) form.requestSubmit();
    else advance();
  });
});

// File upload (code step)
const codeField = form.elements.code;
const fileInput = document.getElementById("code-file");
const fileChip = form.querySelector(".file-chip");
const fileChipName = form.querySelector(".file-chip-name");
let uploadedName = "";

function formatSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
}

function clearUpload() {
  uploadedName = "";
  fileInput.value = "";
  fileChip.hidden = true;
}

async function loadFile(file) {
  if (!file) return;

  if (BLOCKED_EXTENSIONS.test(file.name)) {
    stepError(1, "That file type isn't supported. Upload a text or source-code file.");
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    stepError(1, `File is too large (${formatSize(file.size)}). Max is ${formatSize(MAX_UPLOAD_BYTES)}.`);
    return;
  }

  const text = await file.text();
  if (text.includes("\u0000")) {
    stepError(1, "That looks like a binary file. Upload a text or source-code file.");
    return;
  }
  if (text.length > FIELD_LIMITS.code) {
    stepError(1, `File has ${text.length.toLocaleString()} characters (max ${FIELD_LIMITS.code.toLocaleString()}).`);
    return;
  }

  codeField.value = text;
  uploadedName = file.name;
  fileChipName.textContent = `${file.name} · ${formatSize(file.size)}`;
  fileChip.hidden = false;
  updateCount(1);
  stepError(1);
}

fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
form.querySelector(".file-chip-remove").addEventListener("click", () => {
  clearUpload();
  codeField.value = "";
  updateCount(1);
  codeField.focus();
});

["dragenter", "dragover"].forEach(type =>
  codeField.addEventListener(type, event => {
    event.preventDefault();
    codeField.classList.add("is-dragging");
  })
);
["dragleave", "drop"].forEach(type =>
  codeField.addEventListener(type, () => codeField.classList.remove("is-dragging"))
);
codeField.addEventListener("drop", event => {
  event.preventDefault();
  loadFile(event.dataTransfer.files[0]);
});

goToStep(0, { focus: false });

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

  const debugData = {
    requirements: form.elements.requirements.value,
    code: codeField.value,
    error: form.elements.err.value,
    ...(uploadedName && { filename: uploadedName })
  };

  const missing = steps.findIndex((_, i) => !validateStep(i));
  if (missing !== -1) {
    goToStep(missing);
    setStatus("Fix the highlighted field to continue", "error");
    return;
  }

  submitted = { code: debugData.code, filename: uploadedName };

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
// The whole file with the fix applied, when the model gave a valid line range.
let currentFullCode = "";

function applyPatch(source, fix) {
  const { startLine, endLine, code } = fix;
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) return null;

  const lines = source.split(/\r?\n/);
  if (endLine > lines.length) return null;

  const replacement = code ? code.replace(/\r?\n$/, "").split(/\r?\n/) : [];
  lines.splice(startLine - 1, endLine - startLine + 1, ...replacement);
  return lines.join(source.includes("\r\n") ? "\r\n" : "\n");
}

function renderCodeLines(codeElement, source, firstLine = 1) {
  const lines = source ? source.replace(/\n$/, "").split(/\r?\n/) : [];
  const fragment = document.createDocumentFragment();

  lines.forEach((text, index) => {
    const line = document.createElement("span");
    line.className = "code-line";

    const number = document.createElement("span");
    number.className = "line-num";
    number.textContent = firstLine + index;

    line.append(number, text);
    fragment.append(line);
  });

  codeElement.style.setProperty("--gutter-digits", String(firstLine + lines.length - 1).length);
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
  const fixRange = results.querySelector(".fix-range");
  let firstLine = 1;
  currentFullCode = "";
  fixRange.hidden = true;

  if (result.fix) {
    fixExplanation.textContent = result.fix.explanation;
    currentFixCode = result.fix.code ?? "";
    currentFullCode = applyPatch(submitted.code, result.fix) ?? "";

    if (currentFullCode) {
      firstLine = result.fix.startLine;
      const span = result.fix.startLine === result.fix.endLine
        ? `line ${result.fix.startLine}`
        : `lines ${result.fix.startLine}\u2013${result.fix.endLine}`;
      fixRange.textContent = `Replace ${span}${submitted.filename ? ` in ${submitted.filename}` : ""}`;
      fixRange.hidden = false;
    }
  } else {
    fixExplanation.textContent = "No fix is required.";
    currentFixCode = "";
  }
  renderCodeLines(fixCode, currentFixCode, firstLine);
  resetCodeWindow(currentFullCode || currentFixCode);
  copyBtn.disabled = !currentFixCode;
  downloadBtn.hidden = !currentFullCode;

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

const downloadBtn = document.querySelector(".download-fix-button");

downloadBtn.addEventListener("click", () => {
  const name = submitted.filename || "code.txt";
  const dot = name.lastIndexOf(".");
  const fixedName = dot > 0 ? `${name.slice(0, dot)}.fixed${name.slice(dot)}` : `${name}.fixed`;

  const url = URL.createObjectURL(new Blob([currentFullCode], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fixedName;
  link.click();
  URL.revokeObjectURL(url);
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
  previewFrame.srcdoc = showPreview ? (currentFullCode || currentFixCode) + PREVIEW_REPORTER : "";
}

function resetCodeWindow(code) {
  previewButton.disabled = !HTML_PATTERN.test(code);
  setView("code");
}

viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
