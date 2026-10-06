/* Bug Hunt: Aura Farming Edition — squash bugs, chain combos, spare features. 30 seconds. */

const GAME_SECONDS = 30;
const HOLE_COUNT = 9;
const MAX_ACTIVE = 2;
const FEATURE_CHANCE = 0.2;

const BASE_AURA = 10;
const FEATURE_PENALTY = 15;
const MISS_PENALTY = 5;
const COMBO_STREAK_STEP = 3; // multiplier increases every N consecutive bug hits
const MAX_MULTIPLIER = 5;
const SURGE_EVERY = 10; // a bonus "aura surge" every N-combo milestone
const SURGE_BONUS = 50;

const BEST_KEY = "bughunt-best-aura";

const TARGETS = {
  bug: { glyph: "🐛", label: "Bug! Squash it" },
  feature: { glyph: "✨", label: "Feature! Leave it alone" }
};

// Highest matching tier wins, so keep these sorted by descending min aura.
const RANKS = [
  { min: 2000, name: "AURA GOD 😤" },
  { min: 1200, name: "Unspoken Aura" },
  { min: 800, name: "Sigma Debugger" },
  { min: 500, name: "Rizz Lord" },
  { min: 300, name: "Aura Farmer" },
  { min: 150, name: "Built Different" },
  { min: 60, name: "Mid" },
  { min: 0, name: "NPC" }
];

const RESULT_LINES = [
  { min: 600, text: "Absolute aura god. Production fears you. 😤" },
  { min: 300, text: "Certified aura farmer. 🌾🔥" },
  { min: 120, text: "Solid grind. Respectable aura." },
  { min: 40, text: "Mid aura, ngl." },
  { min: 0, text: "Aura levels critically low. 📉" }
];

const randomBetween = (min, max) => min + Math.random() * (max - min);
const rankFor = aura => RANKS.find(rank => aura >= rank.min).name;
const multiplierFor = streak => Math.min(MAX_MULTIPLIER, 1 + Math.floor(streak / COMBO_STREAK_STEP));

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(aura) {
  try {
    localStorage.setItem(BEST_KEY, String(aura));
  } catch {
    // Storage can be blocked; the best run just won't persist.
  }
}

function initBugHunt() {
  const hunt = document.querySelector(".hunt");
  const grid = document.getElementById("hunt-grid");
  const auraEl = document.getElementById("hunt-aura");
  const timeEl = document.getElementById("hunt-time");
  const bestEl = document.getElementById("hunt-best");
  const rankNameEl = document.getElementById("hunt-rank-name");
  const comboEl = document.getElementById("hunt-combo");
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
  let aura = 0;
  let combo = 0;
  let rank = rankFor(0);
  let timeLeft = GAME_SECONDS;
  let best = readBest();
  let countdownTimer = null;
  let spawnTimer = null;

  function setStatus(text, tone = "") {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-bad", tone === "bad");
    statusEl.classList.toggle("is-good", tone === "good");
  }

  function render() {
    auraEl.textContent = aura;
    timeEl.textContent = timeLeft;
    bestEl.textContent = best;
    rankNameEl.textContent = rank;

    if (combo < 2) {
      comboEl.textContent = "";
      comboEl.removeAttribute("data-tier");
    } else {
      const multiplier = multiplierFor(combo);
      comboEl.textContent = `🔥 ${combo}-streak · ×${multiplier} aura`;
      comboEl.dataset.tier = String(multiplier);
    }
  }

  function shake(strength = "") {
    hunt.classList.remove("is-shaking");
    // Force a reflow so the animation restarts even on back-to-back hits.
    void hunt.offsetWidth;
    hunt.classList.add("is-shaking");
    if (strength) hunt.dataset.shake = strength;
    setTimeout(() => {
      hunt.classList.remove("is-shaking");
      delete hunt.dataset.shake;
    }, 420);
  }

  function pulseRankUp() {
    hunt.classList.remove("is-rankup");
    void hunt.offsetWidth;
    hunt.classList.add("is-rankup");
    setTimeout(() => hunt.classList.remove("is-rankup"), 900);
  }

  function floatText(hole, text, tone) {
    const span = document.createElement("span");
    span.className = `hunt-float is-${tone}`;
    span.textContent = text;
    span.setAttribute("aria-hidden", "true");
    hole.append(span);
    setTimeout(() => span.remove(), 750);
  }

  function burst(hole, emoji, count) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement("span");
      particle.className = "hunt-particle";
      particle.textContent = emoji;
      particle.setAttribute("aria-hidden", "true");

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 34 + Math.random() * 28;
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

      hole.append(particle);
      setTimeout(() => particle.remove(), 650);
    }
  }

  // Checks for a rank change after an aura update; flashes a rank-up moment if so.
  function syncRank(hole) {
    const nextRank = rankFor(aura);
    if (nextRank === rank) return;
    rank = nextRank;
    pulseRankUp();
    burst(hole, "🎉", 10);
  }

  function hideTarget(index, reason = "cleanup") {
    clearTimeout(hideTimers.get(index));
    hideTimers.delete(index);

    const hole = holes[index];
    const kind = hole.dataset.kind;

    if (reason === "timeout" && kind === "bug" && running) {
      combo = 0;
      aura = Math.max(0, aura - MISS_PENALTY);
      floatText(hole, `−${MISS_PENALTY}`, "bad");
      setStatus("Bug escaped. Combo lost.", "bad");
      shake();
      render();
    }

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

    hideTimers.set(index, setTimeout(() => hideTarget(index, "timeout"), targetLifetimeMs()));
  }

  function scheduleSpawn() {
    spawnTimer = setTimeout(() => {
      showTarget();
      scheduleSpawn();
    }, randomBetween(300, 650));
  }

  function hitBug(hole, index) {
    combo += 1;
    const multiplier = multiplierFor(combo);
    let gain = BASE_AURA * multiplier;

    const surged = combo % SURGE_EVERY === 0;
    if (surged) gain += SURGE_BONUS;

    aura += gain;
    floatText(hole, `+${gain}`, surged ? "surge" : "good");

    if (surged) {
      setStatus(`AURA SURGE +${gain} 🔥`, "good");
      shake("surge");
      burst(hole, "✨", 12);
    } else {
      setStatus(`Squashed. +${gain} aura`, "good");
    }

    hideTarget(index, "hit");
    syncRank(hole);
    render();
  }

  function hitFeature(hole, index) {
    combo = 0;
    aura = Math.max(0, aura - FEATURE_PENALTY);
    floatText(hole, `−${FEATURE_PENALTY}`, "bad");
    setStatus(`Bro touched a feature. −${FEATURE_PENALTY} aura 💀`, "bad");
    shake();
    hideTarget(index, "hit");
    render();
  }

  function hit(index) {
    if (!running || !hideTimers.has(index)) return;

    const hole = holes[index];
    if (hole.dataset.kind === "feature") {
      hitFeature(hole, index);
    } else {
      hitBug(hole, index);
    }
  }

  function endGame() {
    running = false;
    clearInterval(countdownTimer);
    clearTimeout(spawnTimer);
    [...hideTimers.keys()].forEach(index => hideTarget(index, "cleanup"));

    const isNewBest = aura > best;
    if (isNewBest) {
      best = aura;
      saveBest(best);
    }

    const { text } = RESULT_LINES.find(line => aura >= line.min);
    setStatus(`${isNewBest ? "New peak aura! " : ""}${aura} AURA — ${rank}. ${text}`);
    startBtn.disabled = false;
    startBtn.textContent = "Farm again";
    render();
  }

  function startGame() {
    aura = 0;
    combo = 0;
    rank = rankFor(0);
    timeLeft = GAME_SECONDS;
    running = true;
    startBtn.disabled = true;
    startBtn.textContent = "Farming…";
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

    // Keep the existing 1–9 shortcuts, but also let keyboard users move
    // around the 3×3 board without reaching for a mouse.
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      const index = Number(event.key) - 1;
      holes[index].focus();
      hit(index);
      return;
    }

    const activeIndex = holes.indexOf(document.activeElement);
    if (activeIndex === -1) return;

    const row = Math.floor(activeIndex / 3);
    const col = activeIndex % 3;
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight") nextIndex = row * 3 + (col + 1) % 3;
    if (event.key === "ArrowLeft") nextIndex = row * 3 + (col + 2) % 3;
    if (event.key === "ArrowDown") nextIndex = ((row + 1) % 3) * 3 + col;
    if (event.key === "ArrowUp") nextIndex = ((row + 2) % 3) * 3 + col;

    if (nextIndex !== activeIndex) {
      event.preventDefault();
      holes[nextIndex].focus();
    }
  });

  startBtn.addEventListener("click", startGame);
  render();
}

document.addEventListener("DOMContentLoaded", initBugHunt);
