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

