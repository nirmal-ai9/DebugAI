// File upload (code step)
const codeField = form.elements.code;
const fileInput = document.getElementById("code-file");
if (fileTrigger) fileTrigger.addEventListener("click", () => fileInput.click());
const fileChip = form.querySelector(".file-chip");
const fileChipName = form.querySelector(".file-chip-name");
let uploadedName = "";
let fileReadVersion = 0;

function formatSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
}

function clearUpload() {
  fileReadVersion++;
  uploadedName = "";
  fileInput.value = "";
  fileChip.hidden = true;
}

async function loadFile(file) {
  if (!file) return;
  const readVersion = ++fileReadVersion;

  if (BLOCKED_EXTENSIONS.test(file.name)) {
    clearUpload();
    stepError(1, "That file type isn't supported. Upload a text or source-code file.");
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    clearUpload();
    stepError(1, `File is too large (${formatSize(file.size)}). Max is ${formatSize(MAX_UPLOAD_BYTES)}.`);
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch {
    if (readVersion !== fileReadVersion) return;
    clearUpload();
    stepError(1, "Couldn't read that file. Try again or paste the code instead.");
    return;
  }
  if (readVersion !== fileReadVersion) return;
  if (text.includes("\u0000")) {
    clearUpload();
    stepError(1, "That looks like a binary file. Upload a text or source-code file.");
    return;
  }
  if (text.length > FIELD_LIMITS.code) {
    clearUpload();
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
codeField.addEventListener("input", () => {
  fileReadVersion++;
});
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

  submitted = { code: debugData.code, filename: uploadedName, requirements: debugData.requirements, error: debugData.error };

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
