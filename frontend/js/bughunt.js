/* Bug Hunt — Upgrade Edition */

const GAME_SECONDS = 30;
const HOLE_COUNT = 9;
const MAX_ACTIVE = 2;
const BEST_KEY = "bughunt-best";

const TARGETS = {
  bug: { glyph: "🐛", label: "Bug! Squash it", pts: 1, type: "bug" },
  crit: { glyph: "👾", label: "Memory Leak! High priority!", pts: 3, type: "crit" },
  feature: { glyph: "✨", label: "Feature! Leave it alone", penalty: 2, type: "feature" },
  coffee: { glyph: "☕", label: "Hot Patch! +3 Seconds", bonusTime: 3, type: "coffee" }
};

const RESULT_LINES = [
  { min: 35, text: "God-Tier Senior Dev. Production is bulletproof. 😎" },
  { min: 20, text: "Solid squashing. QA sends respect. 🫡" },
  { min: 10, text: "Not bad. Junior dev energy." },
  { min: 0, text: "The bugs are filing for residency. 🐛" }
];

// Web Audio API Synthesizer (No external assets required)
const SoundFX = (() => {
  let ctx = null;
  let muted = false;

  function init() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function playTone(freq, type, duration, gainVal = 0.1) {
    if (muted) return;
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
    toggleMute() {
      muted = !muted;
      return muted;
    },
    squash() {
      playTone(520, "triangle", 0.08, 0.15);
      setTimeout(() => playTone(880, "sine", 0.1, 0.12), 30);
    },
    crit() {
      playTone(880, "square", 0.08, 0.12);
      setTimeout(() => playTone(1320, "sine", 0.15, 0.15), 50);
    },
    feature() {
      playTone(180, "sawtooth", 0.18, 0.2);
      setTimeout(() => playTone(120, "sawtooth", 0.22, 0.2), 70);
    },
    coffee() {
      playTone(523, "sine", 0.08, 0.12);
      setTimeout(() => playTone(659, "sine", 0.08, 0.12), 50);
      setTimeout(() => playTone(784, "sine", 0.12, 0.15), 100);
    },
    gameover() {
      playTone(300, "sawtooth", 0.15, 0.15);
      setTimeout(() => playTone(200, "sawtooth", 0.3, 0.15), 120);
    }
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
  const comboEl = document.getElementById("hunt-combo");
  const bestEl = document.getElementById("hunt-best");
  const statusEl = document.getElementById("hunt-status");
  const startBtn = document.getElementById("hunt-start");
  const audioBtn = document.getElementById("hunt-audio-toggle");
  const huntCard = document.querySelector(".hunt");

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
    comboEl.textContent = combo > 1 ? `${combo}x` : "1x";
    comboEl.classList.toggle("is-active", combo > 1);
    bestEl.textContent = best;
  }

  function triggerShake() {
    if (!huntCard) return;
    huntCard.classList.remove("is-shaking");
    void huntCard.offsetWidth;
    huntCard.classList.add("is-shaking");
  }

  function spawnPopText(hole, text, kindClass = "") {
    const pop = document.createElement("span");
    pop.className = `score-pop ${kindClass}`;
    pop.textContent = text;
    hole.appendChild(pop);
    setTimeout(() => pop.remove(), 650);
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
    if (rand < 0.55) return "bug";      // 55%
    if (rand < 0.72) return "feature";  // 17%
    if (rand < 0.88) return "crit";     // 16%
    return "coffee";                    // 12%
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
      triggerShake();
      spawnPopText(hole, `−${target.penalty}`, "is-bad");
      setStatus(`Touched a feature! −${target.penalty}`, true);
    } else if (kind === "coffee") {
      timeLeft += target.bonusTime;
      SoundFX.coffee();
      spawnPopText(hole, `+${target.bonusTime}s`, "is-coffee");
      setStatus(`Hot Patch deployed! +${target.bonusTime}s time`);
    } else {
      combo += 1;
      const multiplier = Math.min(5, Math.floor(combo / 3) + 1);
      const points = target.pts * multiplier;
      score += points;

      if (kind === "crit") SoundFX.crit();
      else SoundFX.squash();

      const popLabel = multiplier > 1 ? `+${points} (${multiplier}x)` : `+${points}`;
      spawnPopText(hole, popLabel, kind === "crit" ? "is-crit" : "is-good");
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
    setStatus(`${isNewBest ? "New Best Score! " : ""}Final Score: ${score}. ${text}`);
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
    setStatus("Squash the bugs! Watch out for features.");
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

    if (keyNum !== null) {
      const targetIndex = keyNum - 1;
      hit(targetIndex);
      holes[targetIndex].classList.add("is-key-pressed");
      setTimeout(() => holes[targetIndex].classList.remove("is-key-pressed"), 120);
    }
  });

  if (audioBtn) {
    audioBtn.addEventListener("click", () => {
      const isMuted = SoundFX.toggleMute();
      audioBtn.textContent = isMuted ? "🔇 Sound Off" : "🔊 Sound On";
      audioBtn.setAttribute("aria-label", isMuted ? "Sound muted" : "Sound enabled");
    });
  }

  startBtn.addEventListener("click", () => {
    SoundFX.init();
    startGame();
  });

  render();
}

document.addEventListener("DOMContentLoaded", initBugHunt);
