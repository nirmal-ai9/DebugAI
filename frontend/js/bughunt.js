/* Bug Hunt — squash bugs, spare features. 30 seconds. */

const GAME_SECONDS = 30;
const HOLE_COUNT = 9;
const MAX_ACTIVE = 2;
const FEATURE_CHANCE = 0.2;
const FEATURE_PENALTY = 2;
const BEST_KEY = "bughunt-best";

const TARGETS = {
  bug: { glyph: "🐛", label: "Bug! Squash it" },
  feature: { glyph: "✨", label: "Feature! Leave it alone" }
};

// Highest matching tier wins, so keep these sorted by descending min score.
const RESULT_LINES = [
  { min: 20, text: "Legendary. Production is safe. For now. 😎" },
  { min: 12, text: "Solid squashing. QA sends respect. 🫡" },
  { min: 5, text: "Not bad. Junior dev energy." },
  { min: 0, text: "The bugs are filing for residency. 🐛" }
];

const randomBetween = (min, max) => min + Math.random() * (max - min);

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage can be blocked; the best score just won't persist.
  }
}

function initBugHunt() {
  const grid = document.getElementById("hunt-grid");
  const scoreEl = document.getElementById("hunt-score");
  const timeEl = document.getElementById("hunt-time");
  const bestEl = document.getElementById("hunt-best");
  const statusEl = document.getElementById("hunt-status");
  const startBtn = document.getElementById("hunt-start");

  const holes = Array.from({ length: HOLE_COUNT }, (_, index) => {
    const hole = document.createElement("button");
    hole.type = "button";
    hole.className = "hole";
    hole.dataset.key = String(index + 1);
    hole.setAttribute("aria-label", `Hole ${index + 1}, empty`);

    const glyph = document.createElement("span");
    glyph.className = "hole-glyph";
    glyph.setAttribute("aria-hidden", "true");
    hole.append(glyph);

    grid.append(hole);
    return hole;
  });

  const hideTimers = new Map();
  let running = false;
  let score = 0;
  let timeLeft = GAME_SECONDS;
  let best = readBest();
  let countdownTimer = null;
  let spawnTimer = null;

  function setStatus(text, isBad = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-bad", isBad);
  }

  function render() {
    scoreEl.textContent = score;
    timeEl.textContent = timeLeft;
    bestEl.textContent = best;
  }

  function hideTarget(index) {
    clearTimeout(hideTimers.get(index));
    hideTimers.delete(index);

    const hole = holes[index];
    hole.classList.remove("is-active");
    delete hole.dataset.kind;
    hole.setAttribute("aria-label", `Hole ${index + 1}, empty`);
  }

  // Targets linger for less time as the clock runs down.
  function targetLifetimeMs() {
    const progress = 1 - timeLeft / GAME_SECONDS;
    return 1000 - progress * 400;
  }

  function showTarget() {
    const emptyHoles = holes.map((_, index) => index).filter(index => !hideTimers.has(index));
    if (emptyHoles.length === 0 || hideTimers.size >= MAX_ACTIVE) return;

    const index = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
    const kind = Math.random() < FEATURE_CHANCE ? "feature" : "bug";
    const hole = holes[index];

    hole.dataset.kind = kind;
    hole.querySelector(".hole-glyph").textContent = TARGETS[kind].glyph;
    hole.setAttribute("aria-label", `Hole ${index + 1}: ${TARGETS[kind].label}`);
    hole.classList.add("is-active");

    hideTimers.set(index, setTimeout(() => hideTarget(index), targetLifetimeMs()));
  }

  function scheduleSpawn() {
    spawnTimer = setTimeout(() => {
      showTarget();
      scheduleSpawn();
    }, randomBetween(300, 650));
  }

  function hit(index) {
    if (!running || !hideTimers.has(index)) return;

    if (holes[index].dataset.kind === "feature") {
      score = Math.max(0, score - FEATURE_PENALTY);
      setStatus(`That was a feature. −${FEATURE_PENALTY}`, true);
    } else {
      score += 1;
      setStatus("Squashed.");
    }

    hideTarget(index);
    render();
  }

  function endGame() {
    running = false;
    clearInterval(countdownTimer);
    clearTimeout(spawnTimer);
    [...hideTimers.keys()].forEach(hideTarget);

    const isNewBest = score > best;
    if (isNewBest) {
      best = score;
      saveBest(best);
    }

    const { text } = RESULT_LINES.find(line => score >= line.min);
    setStatus(`${isNewBest ? "New best! " : ""}Score ${score}. ${text}`);
    startBtn.disabled = false;
    startBtn.textContent = "Play again";
    render();
  }

  function startGame() {
    score = 0;
    timeLeft = GAME_SECONDS;
    running = true;
    startBtn.disabled = true;
    startBtn.textContent = "Playing…";
    setStatus("Go!");
    render();

    countdownTimer = setInterval(() => {
      timeLeft -= 1;
      render();
      if (timeLeft <= 0) endGame();
    }, 1000);

    scheduleSpawn();
  }

  grid.addEventListener("click", event => {
    const hole = event.target.closest(".hole");
    if (hole) hit(holes.indexOf(hole));
  });

  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[1-9]$/.test(event.key)) hit(Number(event.key) - 1);
  });

  startBtn.addEventListener("click", startGame);
  render();
}

document.addEventListener("DOMContentLoaded", initBugHunt);
