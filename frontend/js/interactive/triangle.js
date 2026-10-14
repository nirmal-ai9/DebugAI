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
    if (!scenario) return;

    Object.entries(scenario.edges).forEach(([edge, state]) => {
      const element = edges[edge];
      if (!element) return;

      const marks = { ok: "=", broken: "≠" };
      element.dataset.state = state;

      const mark = element.querySelector(".triangle-mark");
      if (mark) mark.textContent = marks[state];
    });

    readout.textContent = scenario.text;
  }

  select.addEventListener("change", () => render(select.value));
  render(select.value);
}

/* 2. CLOSURE SCRUBBER — var shares a binding, let makes one per loop */
