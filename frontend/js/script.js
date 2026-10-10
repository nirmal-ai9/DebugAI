const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const API_URL = LOCAL_HOSTS.includes(location.hostname)
  ? "http://localhost:8787"
  : "https://debugai-backend.nirmal-ai9.workers.dev";
const REQUEST_TIMEOUT_MS = 90000;

// Keep in sync with LIMITS in backend/src/index.js
const FIELD_LIMITS = { requirements: 4000, code: 20000, err: 8000 };
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
const fileTrigger = document.getElementById("code-file-trigger");
const resultsHeading = document.getElementById("results-heading");
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
    tab.setAttribute("aria-selected", String(i === current));
    tab.setAttribute("tabindex", i === current ? "0" : "-1");
    if (i === current) tab.setAttribute("aria-current", "step");
    else tab.removeAttribute("aria-current");
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

// Keep the wizard fully operable without a mouse: arrow keys move between tabs,
// while Enter/Space activates the focused step.
tabs.forEach((tab, target) => {
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        tab.click();
      }
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (target + direction + tabs.length) % tabs.length;
    tabs[next].focus();
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
    else if (index === 1 && uploadedName) clearUpload();
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
if (fileTrigger) fileTrigger.addEventListener("click", () => fileInput.click());
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
    fileInput.value = "";
    stepError(1, "That file type isn't supported. Upload a text or source-code file.");
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    fileInput.value = "";
    stepError(1, `File is too large (${formatSize(file.size)}). Max is ${formatSize(MAX_UPLOAD_BYTES)}.`);
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch {
    fileInput.value = "";
    stepError(1, "Couldn't read that file. Try again or paste the code instead.");
    return;
  }
  if (text.includes("\u0000")) {
    fileInput.value = "";
    stepError(1, "That looks like a binary file. Upload a text or source-code file.");
    return;
  }
  if (text.length > FIELD_LIMITS.code) {
    fileInput.value = "";
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
  if (btn.disabled) return;

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

// Raw fixed file (or manual snippets), kept apart from the numbered markup so copy and preview stay clean.
let currentFixCode = "";
// The whole file with every patch applied.
let currentFullCode = "";

// The model often drops leading indentation; restore the original line's.
function reindent(source, patch) {
  const code = patch.code ?? "";
  const original = source.split(/\r?\n/)[patch.startLine - 1];
  if (!code || original === undefined) return code;

  const indent = original.match(/^[\t ]*/)[0];
  const lines = code.split(/\r?\n/);
  const widths = lines.filter(l => l.trim()).map(l => l.match(/^[\t ]*/)[0].length);
  const min = widths.length ? Math.min(...widths) : 0;
  if (min >= indent.length) return code;

  return lines.map(l => (l.trim() ? indent + l.slice(min) : l)).join("\n");
}

// Every patch refers to line numbers in the ORIGINAL file. Apply bottom -> top so
// earlier splices never shift later ones, and map highlights to the new numbering.
function applyPatches(source, patches) {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);

  const valid = patches
    .filter(p => Number.isInteger(p.startLine) && Number.isInteger(p.endLine) &&
      p.startLine >= 1 && p.endLine >= p.startLine && p.endLine <= lines.length)
    .sort((a, b) => a.startLine - b.startLine);

  const accepted = [];
  for (const p of valid) {
    const last = accepted[accepted.length - 1];
    if (last && p.startLine <= last.endLine) continue; // overlap: never guess
    const code = reindent(source, p);
    accepted.push({
      ...p,
      replacement: code ? code.replace(/\r?\n$/, "").split(/\r?\n/) : []
    });
  }

  if (!accepted.length) return null;

  const marks = [];
  let delta = 0;
  for (const p of accepted) {
    const count = p.replacement.length;
    if (count) marks.push({ from: p.startLine + delta, to: p.startLine + delta + count - 1 });
    delta += count - (p.endLine - p.startLine + 1);
  }

  for (let i = accepted.length - 1; i >= 0; i--) {
    const p = accepted[i];
    lines.splice(p.startLine - 1, p.endLine - p.startLine + 1, ...p.replacement);
  }

  return { text: lines.join(eol), marks, applied: accepted.map(p => p.id) };
}

function renderCodeLines(codeElement, source, firstLine = 1, marks = []) {
  const lines = source ? source.replace(/\r?\n$/, "").split(/\r?\n/) : [];
  const fragment = document.createDocumentFragment();

  lines.forEach((text, index) => {
    const line = document.createElement("span");
    line.className = "code-line";
    const n = firstLine + index;
    if (marks.some(m => n >= m.from && n <= m.to)) line.classList.add("is-changed");

    const number = document.createElement("span");
    number.className = "line-num";
    number.textContent = n;

    line.append(number, text);
    fragment.append(line);
  });

  codeElement.style.setProperty("--gutter-digits", String(firstLine + lines.length - 1).length);
  codeElement.replaceChildren(fragment);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function rangeLabel(p) {
  return p.startLine === p.endLine ? `line ${p.startLine}` : `lines ${p.startLine}\u2013${p.endLine}`;
}

function buildBugCard(bug, index, total, patchById) {
  const card = el("article", "result-card result-card--bug bracket reveal is-visible");
  const head = el("div", "result-head");
  const icon = el("span", "result-icon");
  icon.setAttribute("aria-hidden", "true");
  head.append(icon);
  head.append(el("h3", "result-title", total > 1 ? `Bug ${index + 1} of ${total}` : "Bug found"));
  card.append(head);

  const meta = el("dl", "bug-meta");
  [["Type", bug.type], ["Line", bug.line ?? "Unknown"]].forEach(([k, v]) => {
    const item = el("div", "bug-meta-item");
    item.append(el("dt", "", k), el("dd", "", String(v)));
    meta.append(item);
  });
  card.append(meta, el("p", "bug-message", bug.message));

  if (bug.why) {
    card.append(el("h4", "bug-subhead", "Why"), el("p", "result-prose", bug.why));
  }
  if (bug.explanation) {
    card.append(el("h4", "bug-subhead", "Fix"), el("p", "result-prose", bug.explanation));
  }

  const placed = (bug.patchIds ?? []).map(id => patchById.get(id)).filter(Boolean);
  if (placed.length) {
    const tags = el("p", "bug-patches", `Edits: ${placed.map(rangeLabel).join(", ")}`);
    card.append(tags);
  }

  (bug.unplaced ?? []).forEach(item => {
    const box = el("div", "bug-manual");
    box.append(el("p", "fix-range", `Couldn't safely place this edit (${item.reason}). Apply by hand:`));
    box.append(el("pre", "bug-manual-code", item.code));
    card.append(box);
  });

  return card;
}

function showResult(data) {
  const result = data.result;
  const results = document.getElementById("results");
  const bugList = document.getElementById("bug-list");
  const fixCard = results.querySelector(".result-card--fix");
  const fixExplanation = fixCard.querySelector(".result-prose");
  const fixRange = fixCard.querySelector(".fix-range");
  const fixCode = fixCard.querySelector(".code-fix code");

  const bugs = Array.isArray(result.bugs) ? result.bugs : [];
  const patches = Array.isArray(result.patches) ? result.patches : [];
  const patchById = new Map(patches.map(p => [p.id, p]));

  bugList.replaceChildren();
  if (bugs.length) {
    bugs.forEach((bug, i) => bugList.append(buildBugCard(bug, i, bugs.length, patchById)));
  } else {
    const card = el("article", "result-card result-card--bug bracket reveal is-visible");
    const head = el("div", "result-head");
    head.append(el("h3", "result-title", "No bug found"));
    card.append(head, el("p", "bug-message", result.why || "No obvious bug was detected."));
    bugList.append(card);
  }

  let marks = [];
  currentFullCode = "";
  currentFixCode = "";
  fixRange.hidden = true;
  fixCard.hidden = !bugs.length;

  if (bugs.length) {
    const where = submitted.filename ? `: ${submitted.filename}` : "";
    const applied = patches.length ? applyPatches(submitted.code, patches) : null;

    if (applied) {
      currentFullCode = applied.text;
      marks = applied.marks;
      const n = applied.applied.length;
      fixExplanation.textContent = `${n} edit${n === 1 ? "" : "s"} applied across ${bugs.length} issue${bugs.length === 1 ? "" : "s"}.`;
      fixRange.textContent = `Complete fixed file${where} \u00b7 ${n} changed ${n === 1 ? "range" : "ranges"} highlighted`;
      fixRange.hidden = false;
      currentFixCode = currentFullCode;
    } else {
      // Never guess a position: a misplaced fix would corrupt the file.
      currentFixCode = bugs.flatMap(b => b.unplaced ?? []).map(u => u.code).join("\n\n");
      fixExplanation.textContent = "Couldn't safely place the fixes in your file. Apply the snippets by hand.";
    }
  }

  renderCodeLines(fixCode, currentFixCode, 1, marks);
  resetCodeWindow(currentFullCode);
  copyBtn.disabled = !currentFixCode;
  downloadBtn.hidden = !currentFullCode;
  const firstChanged = fixCode.querySelector(".is-changed");

  results.hidden = false;
  results.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));

  results.scrollIntoView({ behavior: "smooth", block: "start" });
  if (resultsHeading) resultsHeading.focus({ preventScroll: true });

  if (firstChanged) {
    codePanel.scrollTop = Math.max(0, firstChanged.offsetTop - codePanel.clientHeight / 3);
  }
}

const copyBtn = document.querySelector(".apply-fix-actions .apply-fix-button:not(.download-fix-button)");
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
  previewButton.disabled = !HTML_PATTERN.test(code.slice(0, 20000));
  setView("code");
}

viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
