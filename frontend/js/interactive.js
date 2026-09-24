document.addEventListener("DOMContentLoaded", () => {
  triangleDemo();
  closureDemo();
  challengeDemo();
});

/* 1. THREE-WAY DIFF — intent / code / console as a reactive triangle */
function triangleDemo() {
  const select = document.getElementById("triangle-select");
  const readout = document.getElementById("triangle-readout");
  if (!select || !readout) return;

  const edges = {
    intentCode: document.getElementById("edge-intent-code"),
    codeConsole: document.getElementById("edge-code-console"),
    intentConsole: document.getElementById("edge-intent-console"),
  };

  const scenarios = {
    working: {
      edges: { intentCode: "ok", codeConsole: "ok", intentConsole: "ok" },
      text: "All three agree — nothing to diagnose. The code does what you meant, and the console confirms it.",
    },
    logic: {
      edges: { intentCode: "broken", codeConsole: "ok", intentConsole: "broken" },
      text: "Code and console agree with each other, but not with intent. This is a silent logic bug — nothing throws, it just does the wrong thing.",
    },
    runtime: {
      edges: { intentCode: "ok", codeConsole: "broken", intentConsole: "broken" },
      text: "The code matches what you meant, but the console disagrees with both. Something outside the snippet — timing, environment, a missing await — is the real cause.",
    },
  };

  function render(key) {
    const scenario = scenarios[key];
    Object.entries(scenario.edges).forEach(([edge, state]) => {
      const marks = { ok: "=", broken: "≠" };
      edges[edge].dataset.state = state;
      edges[edge].querySelector(".triangle-mark").textContent = marks[state];
    });
    readout.textContent = scenario.text;
  }

  select.addEventListener("change", () => render(select.value));
  render(select.value);
}

/* 2. CLOSURE SCRUBBER — var shares a binding, let makes one per loop */
function closureDemo() {
  const slider = document.getElementById("closure-slider");
  const keyword = document.getElementById("closure-keyword");
  const memory = document.getElementById("closure-memory-let");
  const runBtn = document.getElementById("closure-run");
  const readout = document.getElementById("closure-readout");
  if (!slider || !memory || !runBtn) return;

  const handlers = memory.querySelectorAll(".closure-handler");
  const cells = memory.querySelectorAll(".closure-cell");

  function setMode(isLet) {
    keyword.textContent = isLet ? "let" : "var";
    memory.classList.toggle("closure-memory--shared", !isLet);

    if (isLet) {
      cells.forEach((cell, i) => {
        cell.hidden = false;
        cell.querySelector(".closure-value").textContent = i;
      });
    } else {
      cells.forEach((cell, i) => {
        cell.hidden = i !== cells.length - 1;
        cell.querySelector(".closure-value").textContent = "3";
      });
    }
    readout.textContent = "";
  }

  const cellFor = (isLet, i) => cells[isLet ? i : cells.length - 1];

  async function run() {
    const isLet = slider.value === "1";
    runBtn.disabled = true;
    slider.disabled = true;
    setMode(isLet);

    handlers.forEach((handler, i) => {
      handler.classList.add("is-pending");
      cellFor(isLet, i).classList.add("is-pending");
    });

    for (let i = 0; i < handlers.length; i++) {
      await new Promise((r) => setTimeout(r, 450));
      handlers[i].classList.remove("is-pending");
      cellFor(isLet, i).classList.remove("is-pending");
      readout.textContent = `handler[${i}] logged: ${isLet ? i : 3}`;
    }

    readout.textContent = isLet
      ? "Each handler closed over its own i — logs 0, 1, 2."
      : "Every handler closed over the same i — by the time any of them run, the loop has already finished, so all three log 3.";
    runBtn.disabled = false;
    slider.disabled = false;
  }

  slider.addEventListener("input", () => setMode(slider.value === "1"));
  runBtn.addEventListener("click", run);
  setMode(true);
}

/* 3. BEAT THE DIAGNOSTIC — spot the buggy line before seeing the fix */
function challengeDemo() {
  const codeList = document.getElementById("challenge-code");
  const intentText = document.getElementById("challenge-intent-text");
  const consoleEl = document.getElementById("challenge-console");
  const progressEl = document.getElementById("challenge-progress");
  const scoreEl = document.getElementById("challenge-score");
  const nextBtn = document.getElementById("challenge-next");
  if (!codeList || !nextBtn) return;

  const rounds = [
    {
      intent: "Sum an array of numbers.",
      lines: ["function sum(nums) {", "  let total;", "  for (const n of nums) total += n;", "  return total;", "}"],
      buggyLine: 1,
      console: "> sum([1, 2, 3]) → NaN",
      explanation: "total starts as undefined, so undefined + 1 is NaN. Initialize it to 0.",
    },
    {
      intent: 'Return the user\'s first name, or "Guest" if there\'s no user.',
      lines: ["function greet(user) {", '  const name = user.firstName || "Guest";', "  return `Hi, ${name}`;", "}", "greet(null);"],
      buggyLine: 1,
      console: "> TypeError: Cannot read properties of null (reading 'firstName')",
      explanation: "user.firstName throws when user is null, so the || \"Guest\" fallback never gets a chance to run. Use user?.firstName.",
    },
    {
      intent: "Remove duplicate values from an array.",
      lines: ["function dedupe(arr) {", "  return arr.filter((val, i) => {", "    return arr.indexOf(val) === i;", "  });", "}"],
      buggyLine: 2,
      console: "> dedupe([1, 2, 2, 3]) → [1, 2, 3] (correct, but slow on large arrays)",
      explanation: "Not a crash — indexOf inside filter is O(n²). Not every bug throws; some just cost you at scale. A Set-based pass fixes it in O(n).",
    },
  ];

  let round = 0;
  let score = 0;

  function render() {
    const r = rounds[round];
    intentText.textContent = " " + r.intent;
    consoleEl.textContent = r.console;
    progressEl.textContent = `Round ${round + 1} of ${rounds.length}`;
    scoreEl.textContent = `Score: ${score}`;
    nextBtn.hidden = true;

    codeList.replaceChildren();
    r.lines.forEach((line, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "challenge-line";
      btn.textContent = line;
      btn.addEventListener("click", () => pick(i, btn));
      li.appendChild(btn);
      codeList.appendChild(li);
    });
  }

  function pick(i, btn) {
    const r = rounds[round];
    const buttons = codeList.querySelectorAll(".challenge-line");
    buttons.forEach((b) => (b.disabled = true));

    if (i === r.buggyLine) {
      btn.classList.add("is-correct");
      score += 1;
    } else {
      btn.classList.add("is-wrong");
      buttons[r.buggyLine].classList.add("is-correct");
    }

    consoleEl.textContent = `${r.console}\n\n${r.explanation}`;
    scoreEl.textContent = `Score: ${score}`;
    nextBtn.hidden = false;
    nextBtn.textContent = round === rounds.length - 1 ? "Play again" : "Next bug";
  }

  nextBtn.addEventListener("click", () => {
    round = (round + 1) % rounds.length;
    if (round === 0) score = 0;
    render();
  });

  render();
}
