/* Hero terminal — a tiny live console under the scripted boot demo.
   Commands: whoami, roast [name], help, clear */

const WHOAMI_LINES = [
  "You’re the legend who just walked into the wrong chat. 💀",
  "You’re the main character… according to your own imagination.",
  "You’re the reason the group chat needs moderation. 😭",
  "You’re basically a loading screen with confidence.",
  "You’re the human version of “404 Not Found.”",
  "You’re that one bug nobody knows how to fix. 🐛",
  "You’re the CEO of asking obvious questions.",
  "You’re a side character with main-character confidence.",
  "You’re the plot twist nobody requested.",
  "You’re proof that the tutorial can be skipped.",
  "You’re an error message with a personality.",
  "You’re the reason Ctrl+Z was invented.",
  "You’re a Wi-Fi signal with commitment issues.",
  "You’re the update nobody installed.",
  "You’re basically chaos wearing a username.",
  "You’re the human equivalent of a typo.",
  "You’re a feature disguised as a bug.",
  "You’re the final boss of unnecessary questions.",
  "You’re running on 1% battery and pure confidence. 🔋",
  "You’re you… unfortunately, there’s no rollback. 💀"
];

const ROAST_LINES = [
  "Bro, your Wi-Fi has more connection than you do. 💀",
  "Your brain really said, “Loading…” and never finished.",
  "You bring everyone so much joy… when you leave the room.",
  "Even autocorrect gave up on fixing your messages.",
  "Your code has more bugs than a jungle. 🐛",
  "You’re not slow, you’re just running on Internet Explorer.",
  "Your confidence is impressive for someone who’s wrong this often.",
  "Bro, your logic just rage-quit.",
  "You have two brain cells, and both are buffering.",
  "Even Google would say, “I have no idea what you mean.”",
  "Your plans have more plot twists than a movie.",
  "You debug code by creating three new bugs. 💀",
  "Bro, your keyboard deserves hazard pay.",
  "Your memory has the storage capacity of a potato.",
  "You don’t make mistakes; you create undocumented features.",
  "Your code doesn’t crash—it escapes.",
  "Even your semicolons are disappointed in you.",
  "Bro, your CPU is working harder than your brain.",
  "You’re proof that copy-paste is a powerful skill.",
  "Your code runs perfectly… in your imagination. 😭"
];

const HELP_TEXT = "Commands: whoami, roast [name], clear";

function pickRandom(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

// Puts a name ahead of a roast line and lower-cases its first letter so it reads as one sentence.
function withName(line, name) {
  if (!name) return line;
  return `${name}, ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
}

function runCommand(value) {
  const [command, ...rest] = value.split(/\s+/);
  const name = rest.join(" ").trim();

  switch (command.toLowerCase()) {
    case "whoami":
      return { text: pickRandom(WHOAMI_LINES), cls: "out" };
    case "roast":
      return { text: withName(pickRandom(ROAST_LINES), name), cls: "out" };
    case "help":
      return { text: HELP_TEXT, cls: "out" };
    case "clear":
      return { clear: true };
    default:
      return { text: `command not found: ${command} — try "help"`, cls: "err" };
  }
}

function buildPromptRow() {
  const row = document.createElement("form");
  row.className = "terminal-prompt-line";
  row.setAttribute("autocomplete", "off");

  const label = document.createElement("span");
  label.className = "terminal-prompt-label";
  label.textContent = "$ debug";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "terminal-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Debug console command");
  input.placeholder = "whoami";

  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");

  row.append(label, input, cursor);
  return { row, input };
}

function initTerminalConsole(container) {
  if (!container) return;

  const { row: promptRow, input } = buildPromptRow();

  function printLine(text, cls) {
    const line = document.createElement("p");
    line.className = "terminal-line";
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    line.append(span);
    container.insertBefore(line, promptRow);
  }

  promptRow.addEventListener("submit", event => {
    event.preventDefault();
    const value = input.value.trim();
    input.value = "";

    printLine(value ? `$ debug ${value}` : "$ debug", "prompt");

    if (value) {
      const result = runCommand(value);
      if (result.clear) {
        container.querySelectorAll(".terminal-line").forEach(line => line.remove());
      } else {
        printLine(result.text, result.cls);
      }
    }

    container.scrollTop = container.scrollHeight;
  });

  container.append(promptRow);
  container.scrollTop = container.scrollHeight;
}

window.initTerminalConsole = initTerminalConsole;
