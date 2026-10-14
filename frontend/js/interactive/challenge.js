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
      lines: [
        "function sum(nums) {",
        "  let total;",
        "  for (const n of nums) total += n;",
        "  return total;",
        "}",
      ],
      buggyLine: 1,
      console: "> sum([1, 2, 3]) → NaN",
      explanation:
        "total starts as undefined, so undefined + 1 is NaN. Initialize it to 0.",
    },
    {
      intent:
        'Return the user\'s first name, or "Guest" if there\'s no user.',
      lines: [
        "function greet(user) {",
        '  const name = user.firstName || "Guest";',
        "  return `Hi, ${name}`;",
        "}",
        "greet(null);",
      ],
      buggyLine: 1,
      console:
        "> TypeError: Cannot read properties of null (reading 'firstName')",
      explanation:
        'user.firstName throws when user is null, so the || "Guest" fallback never gets a chance to run. Use user?.firstName.',
    },
    {
      intent: "Remove duplicate values from an array.",
      lines: [
        "function dedupe(arr) {",
        "  return arr.filter((val, i) => {",
        "    return arr.indexOf(val) === i;",
        "  });",
        "}",
      ],
      buggyLine: 2,
      console:
        "> dedupe([1, 2, 2, 3]) → [1, 2, 3] (correct, but slow on large arrays)",
      explanation:
        "Not a crash — indexOf inside filter is O(n²). Not every bug throws; some just cost you at scale. A Set-based pass fixes it in O(n).",
    },
  ];

  let round = 0;
  let score = 0;

  function updateRovingTabIndex(activeIndex = 0) {
    const buttons = [
      ...codeList.querySelectorAll(".challenge-line"),
    ];

    buttons.forEach((button, index) => {
      button.tabIndex = index === activeIndex ? 0 : -1;
    });
  }

  function moveFocus(currentButton, direction) {
    const buttons = [
      ...codeList.querySelectorAll(".challenge-line"),
    ];

    if (!buttons.length) return;

    const currentIndex = buttons.indexOf(currentButton);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (direction) {
      case "next":
        nextIndex = (currentIndex + 1) % buttons.length;
        break;

      case "previous":
        nextIndex =
          (currentIndex - 1 + buttons.length) % buttons.length;
        break;

      case "first":
        nextIndex = 0;
        break;

      case "last":
        nextIndex = buttons.length - 1;
        break;
    }

    updateRovingTabIndex(nextIndex);
    buttons[nextIndex].focus();
  }

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

      btn.setAttribute(
        "aria-label",
        `Line ${i + 1}: ${line.trim() || "blank"}`
      );

      btn.setAttribute("aria-posinset", String(i + 1));
      btn.setAttribute("aria-setsize", String(r.lines.length));

      btn.tabIndex = i === 0 ? 0 : -1;

      btn.addEventListener("click", () => {
        pick(i, btn);
      });

      btn.addEventListener("keydown", (event) => {
        switch (event.key) {
          case "ArrowDown":
          case "ArrowRight":
            event.preventDefault();
            moveFocus(btn, "next");
            break;

          case "ArrowUp":
          case "ArrowLeft":
            event.preventDefault();
            moveFocus(btn, "previous");
            break;

          case "Home":
            event.preventDefault();
            moveFocus(btn, "first");
            break;

          case "End":
            event.preventDefault();
            moveFocus(btn, "last");
            break;

          case "Enter":
          case " ":
            event.preventDefault();
            btn.click();
            break;
        }
      });

      li.appendChild(btn);
      codeList.appendChild(li);
    });
  }

  function pick(i, btn) {
    const r = rounds[round];

    const buttons = [
      ...codeList.querySelectorAll(".challenge-line"),
    ];

    buttons.forEach((button) => {
      button.disabled = true;
    });

    if (i === r.buggyLine) {
      btn.classList.add("is-correct");
      score += 1;
    } else {
      btn.classList.add("is-wrong");

      if (buttons[r.buggyLine]) {
        buttons[r.buggyLine].classList.add("is-correct");
      }
    }

    consoleEl.textContent =
      `${r.console}\n\n${r.explanation}`;

    scoreEl.textContent = `Score: ${score}`;

    nextBtn.hidden = false;
    nextBtn.textContent =
      round === rounds.length - 1
        ? "Play again"
        : "Next bug";

    nextBtn.focus();
  }

  nextBtn.addEventListener("click", () => {
    round = (round + 1) % rounds.length;

    if (round === 0) {
      score = 0;
    }

    render();

    const firstLine = codeList.querySelector(".challenge-line");
    if (firstLine) {
      firstLine.focus();
    }
  });

  render();
}
