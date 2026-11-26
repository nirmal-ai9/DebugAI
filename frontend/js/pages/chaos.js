(() => {
  const screens = ["intro", "investigation", "union", "court", "verdict", "final", "ending-developer", "ending-bug", "secret"];
  const show = name => {
    screens.forEach(screen => {
      const el = document.getElementById(`screen-${screen}`);
      if (!el) return;
      const active = screen === name;
      el.hidden = !active;
      el.classList.toggle("active", active);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const on = (id, event, callback) => document.getElementById(id)?.addEventListener(event, callback);

  on("to-investigation", "click", () => show("investigation"));
  on("to-union", "click", () => show("union"));
  on("to-court", "click", () => show("court"));

  const transcript = document.getElementById("court-transcript");
  const verdictCopy = document.getElementById("verdict-copy");
  const responses = {
    innocent: {
      line: 'DEFENSE: “My code is perfect.” JUDGE: “Interesting. Then explain line 47.” CONSOLE: *starts screaming*',
      verdict: "The court reviewed your confidence, your browser tabs, and a function named finalFinal_v7_REAL.js. The verdict was unanimous."
    },
    guilty: {
      line: 'DEFENSE: “It was a missing semicolon.” JUDGE: “This is JavaScript. You cannot use that excuse here.”',
      verdict: "A rare moment of honesty. Unfortunately, the court also found 14 TODO comments and a function named doEverything()."
    },
    blame: {
      line: 'DEFENSE: “It is the cache.” JUDGE: “You blamed the cache before even checking.” CACHE: “Leave me out of this.”',
      verdict: "The cache has filed a counterclaim. Your browser history has been submitted as evidence."
    }
  };

  document.querySelectorAll("[data-plea]").forEach(button => {
    button.addEventListener("click", () => {
      const result = responses[button.dataset.plea];
      if (!result || !transcript || !verdictCopy) return;
      transcript.replaceChildren();
      const label = document.createElement("span");
      label.className = "transcript-label";
      label.textContent = "$ COURT_TRANSCRIPT";
      const message = document.createElement("span");
      message.textContent = result.line;
      transcript.append(label, message);
      verdictCopy.textContent = result.verdict;
      show("verdict");
    });
  });

  on("accept-verdict", "click", () => show("final"));

  const reset = () => {
    if (transcript) {
      transcript.replaceChildren();
      const label = document.createElement("span");
      label.className = "transcript-label";
      label.textContent = "$ COURT_CLERK";
      transcript.append(label, document.createTextNode('The defendant is accused of saying “it works on my machine” without providing evidence.'));
    }
    if (verdictCopy) verdictCopy.textContent = "After reviewing 847 console.logs and one suspicious Stack Overflow tab...";
    show("intro");
  };
  on("play-again", "click", reset);
  on("secret-restart", "click", reset);
  on("developer-ending", "click", () => show("ending-developer"));
  on("bug-ending", "click", () => show("ending-bug"));
  on("developer-restart", "click", reset);
  on("bug-restart", "click", reset);

  // The semicolon is intentionally discoverable but never required to finish the story.
  on("secret-semicolon", "click", () => show("secret"));
})();
