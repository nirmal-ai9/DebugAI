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

