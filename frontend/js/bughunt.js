/* Bug Hunt — Upgrade Edition */

const GAME_SECONDS = 30;
const HOLE_COUNT = 9;
const MAX_ACTIVE = 2;
const BEST_KEY = "bughunt-best";

const TARGETS = {
  bug: { glyph: "🐛", label: "Bug! Squash it", pts: 1, kind: "bug" },
  crit: { glyph: "👾", label: "Memory Leak! High priority!", pts: 3, kind: "crit" },
  feature: { glyph: "✨", label: "Feature! Leave it alone", penalty: 2, kind: "feature" },
  coffee: { glyph: "☕", label: "Hot Patch! +3 Seconds", bonusTime: 3, kind: "coffee" }
};

const RESULT_LINES = [
  { min: 35, text: "God-Tier Senior Dev. Production is bulletproof. 😎" },
  { min: 20, text: "Solid squashing. QA sends respect. 🫡" },
  { min: 10, text: "Not bad. Junior dev energy." },
  { min: 0, text: "The bugs are filing for residency. 🐛" }
];

// Synthesized Web Audio (Zero external files, auto-initializes on first click)
const SoundFX = (() => {
  let ctx = null;

  function init() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function play(freq, type, duration, gainVal = 0.1) {
    init();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  }

  return {
    init,
    squash: () => { play(520, "triangle", 0.08, 0.12); setTimeout(() => play(880, "sine", 0.1, 0.1), 30); },
    crit: () => { play(880, "square", 0.08, 0.1); setTimeout(() => play(1320, "sine", 0.15, 0.12), 50); },
    feature: () => { play(180, "sawtooth", 0.18, 0.18); setTimeout(() => play(120, "sawtooth", 0.22, 0.18), 70); },
    coffee: () => { play(523, "sine", 0.08, 0.1); setTimeout(() => play(659, "sine", 0.08, 0.1), 50); setTimeout(() => play(784, "sine", 0.12, 0.12), 100); },
    gameover: () => { play(300, "sawtooth", 0.15, 0.12); setTimeout(() => play(200, "sawtooth", 0.3, 0.12), 120); }
  };
})();

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
    // Storage restricted
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
  let combo = 0;
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

  function spawnPopText(hole, text, kindClass = "") {
    const pop = document.createElement("span");
    pop.className = `score-pop ${kindClass}`;
    pop.textContent = text;
    hole.appendChild(pop);
    setTimeout(() => pop.remove(), 600);
  }

  function hideTarget(index) {
    clearTimeout(hideTimers.get(index));
    hideTimers.delete(index);

    const hole = holes[index];
    hole.classList.remove("is-active");
    delete hole.dataset.kind;
    hole.setAttribute("aria-label", `Hole ${index + 1}, empty`);
  }

  function targetLifetimeMs() {
    const progress = 1 - timeLeft / GAME_SECONDS;
    return Math.max(450, 950 - progress * 400);
  }

  function getRandomKind() {
    const rand = Math.random();
    if (rand < 0.55) return "bug";      // 55% standard bug
    if (rand < 0.72) return "feature";  // 17% feature penalty
    if (rand < 0.88) return "crit";     // 16% fast memory leak
    return "coffee";                    // 12% hot patch (+time)
  }

  function showTarget() {
    const emptyHoles = holes.map((_, index) => index).filter(index => !hideTimers.has(index));
    if (emptyHoles.length === 0 || hideTimers.size >= MAX_ACTIVE) return;

    const index = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
    const kind = getRandomKind();
    const hole = holes[index];
    const target = TARGETS[kind];

    hole.dataset.kind = kind;
    hole.querySelector(".hole-glyph").textContent = target.glyph;
    hole.setAttribute("aria-label", `Hole ${index + 1}: ${target.label}`);
    hole.classList.add("is-active");

    const duration = kind === "crit" ? targetLifetimeMs() * 0.7 : targetLifetimeMs();
    hideTimers.set(index, setTimeout(() => hideTarget(index), duration));
  }

  function scheduleSpawn() {
    spawnTimer = setTimeout(() => {
      showTarget();
      if (running) scheduleSpawn();
    }, randomBetween(250, 550));
  }

  function hit(index) {
    if (!running || !hideTimers.has(index)) return;

    SoundFX.init();
    const hole = holes[index];
    const kind = hole.dataset.kind;
    const target = TARGETS[kind];

    if (kind === "feature") {
      combo = 0;
      score = Math.max(0, score - target.penalty);
      SoundFX.feature();
      spawnPopText(hole, `−${target.penalty}`, "is-bad");
      setStatus(`Touched a feature! −${target.penalty}`, true);
    } else if (kind === "coffee") {
      timeLeft += target.bonusTime;
      SoundFX.coffee();
      spawnPopText(hole, `+${target.bonusTime}s`, "is-good");
      setStatus(`Hot Patch deployed! +${target.bonusTime}s`);
    } else {
      combo += 1;
      const multiplier = Math.min(5, Math.floor(combo / 3) + 1);
      const points = target.pts * multiplier;
      score += points;

      if (kind === "crit") SoundFX.crit();
      else SoundFX.squash();

      const label = multiplier > 1 ? `+${points} (${multiplier}x)` : `+${points}`;
      spawnPopText(hole, label, "is-good");
      setStatus(kind === "crit" ? "Memory leak patched!" : "Squashed!");
    }

    hideTarget(index);
    render();
  }

  function endGame() {
    running = false;
    clearInterval(countdownTimer);
    clearTimeout(spawnTimer);
    [...hideTimers.keys()].forEach(hideTarget);

    SoundFX.gameover();

    const isNewBest = score > best;
    if (isNewBest) {
      best = score;
      saveBest(best);
    }

    const { text } = RESULT_LINES.find(line => score >= line.min) || RESULT_LINES[RESULT_LINES.length - 1];
    setStatus(`${isNewBest ? "New best! " : ""}Score ${score}. ${text}`);
    startBtn.disabled = false;
    startBtn.textContent = "Play again";
    render();
  }

  function startGame() {
    score = 0;
    combo = 0;
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
    let keyNum = null;
    if (/^[1-9]$/.test(event.key)) keyNum = Number(event.key);
    else if (/^Numpad[1-9]$/.test(event.code)) keyNum = Number(event.code.replace("Numpad", ""));

    if (keyNum !== null) hit(keyNum - 1);
  });

  startBtn.addEventListener("click", () => {
    SoundFX.init();
    startGame();
  });

  render();
}

document.addEventListener("DOMContentLoaded", initBugHunt);
