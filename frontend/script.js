const form = document.querySelector(".debug-form");
const msg = document.querySelector(".submit-note");
const btn = document.querySelector(".submit-button");

form.addEventListener("submit", async function(event) {
  event.preventDefault();
   btn.disabled = true;
  
  const requirements = document.getElementById("requirements").value;
  const code = document.getElementById("code").value;
  const error = document.getElementById("err").value;
  
  const debugData = {
    requirements: requirements,
    code: code,
    error: error
  };
  
  if(requirements === "" || code === ""){
    msg.style.color = "white";
    msg.textContent = "Requirements and code are required";
    btn.disabled = false;
    return
  }else{
    msg.style.color = "white";  
    msg.textContent = "Working on it";
    msg.classList.add("dot");
  }
  
  try{
    const response = await fetch("https://debugai-backend.nirmal-ai9.workers.dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(debugData)
      }
    );

    // Read the body first — the backend always sends a `message`,
    // even on 400/502, and status alone hides it.
    const data = await response.json();

    if(data.success === false){
      msg.textContent = data.message || "Invalid code or request";
    }else{
      showResult(data);
      msg.textContent = "Done";
    }
    
    msg.classList.remove("dot");
    
  }catch(error){
    console.error("Request failed:", error);
    msg.textContent = `Failed: ${error.name} - ${error.message}`;
    msg.classList.remove("dot");
  } finally {
    btn.disabled = false;
  }
  
});

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
  why.textContent = result.why;

  // Fill fix
  if (result.fix) {
    fixExplanation.textContent = result.fix.explanation;
    fixCode.textContent = result.fix.code;
  } else {
    fixExplanation.textContent = "No fix is required.";
    fixCode.textContent = "";
  }
  resetCodeWindow(fixCode.textContent);

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
const fixCode = document.querySelector("#results .code-fix code");

copyBtn.addEventListener("click", async function() {
  try {
    await navigator.clipboard.writeText(fixCode.innerText);
    
    copyBtn.textContent = "Copied!";
    
    setTimeout(() => {
      copyBtn.textContent = "Copy fix";
    }, 2000);
    
  } catch (error) {
    console.error("Copy failed:", error);
    copyBtn.textContent = "Copy failed";
    
    setTimeout(() => {
      copyBtn.textContent = "Copy fix";
    }, 2000);
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
  previewFrame.srcdoc = showPreview ? fixCode.textContent + PREVIEW_REPORTER : "";
}

function resetCodeWindow(code) {
  previewButton.disabled = !HTML_PATTERN.test(code);
  setView("code");
}

viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
