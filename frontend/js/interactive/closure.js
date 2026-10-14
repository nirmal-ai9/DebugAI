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

    cells.forEach((cell, i) => {
      cell.hidden = !isLet && i !== cells.length - 1;

      const value = cell.querySelector(".closure-value");
      if (value) {
        value.textContent = isLet ? i : "3";
      }
    });

    if (readout) readout.textContent = "";
  }

  const cellFor = (isLet, i) =>
    cells[isLet ? i : cells.length - 1];

  async function run() {
    const isLet = slider.value === "1";

    runBtn.disabled = true;
    slider.disabled = true;

    setMode(isLet);

    handlers.forEach((handler, i) => {
      handler.classList.add("is-pending");
      const cell = cellFor(isLet, i);
      if (cell) cell.classList.add("is-pending");
    });

    for (let i = 0; i < handlers.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 450));

      handlers[i].classList.remove("is-pending");

      const cell = cellFor(isLet, i);
      if (cell) cell.classList.remove("is-pending");

      if (readout) {
        readout.textContent =
          `handler[${i}] logged: ${isLet ? i : 3}`;
      }
    }

    if (readout) {
      readout.textContent = isLet
        ? "Each handler closed over its own i — logs 0, 1, 2."
        : "Every handler closed over the same i — by the time any of them run, the loop has already finished, so all three log 3.";
    }

    runBtn.disabled = false;
    slider.disabled = false;

    runBtn.focus();
  }

  slider.addEventListener("input", () => {
    setMode(slider.value === "1");
  });

  runBtn.addEventListener("click", run);

  setMode(true);
}

/* 3. BEAT THE DIAGNOSTIC — spot the buggy line before seeing the fix */
