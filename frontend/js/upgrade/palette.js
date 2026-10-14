(() => {
  const state = window.DebugAIUpgrade;
  const { $, mk, results } = state;
  const exportReport = state.exportReport;
  const loadSample = state.loadSample;
  const history = state.history;
  const fill = state.fill;
  const click = sel => () => $(sel)?.click();
  const COMMANDS = [
    { label: "Debug something", tag: "go", run: () => { $("#debug-tool").scrollIntoView({ behavior: "smooth" }); window.DebugAI.goToStep(0); } },
    { label: "Load a sample bug", tag: "tool", run: loadSample },
    { label: "Clear the form", tag: "tool", run: () => { fill({ requirements: "", code: "", error: "" }); window.DebugAI.goToStep(0, { focus: false }); } },
    { label: "Open history", tag: "view", run: history.show },
    { label: "Toggle light / dark theme", tag: "view", run: click("#theme-toggle-btn") },
    { label: "Toggle matrix rain", tag: "view", run: click("#rain-toggle-btn") },
    { label: "Copy fixed code", tag: "result", needsResult: true, run: click(".apply-fix-actions .apply-fix-button:not(.download-fix-button):not(.export-md-button)") },
    { label: "Download fixed file", tag: "result", needsResult: true, run: () => { const b = $(".download-fix-button"); if (b && !b.hidden) b.click(); } },
    { label: "Export Markdown report", tag: "result", needsResult: true, run: exportReport },
    { label: "Play Bug Hunt", tag: "go", run: () => { location.href = "bughunt.html"; } },
    { label: "About DebugAI", tag: "go", run: () => { location.href = "about.html"; } }
  ];

  function buildPalette() {
    const dlg = mk("dialog", "palette");
    dlg.setAttribute("aria-label", "Command palette");
    const input = mk("input", "palette-input");
    input.type = "text";
    input.placeholder = "Type a command\u2026";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Search commands");
    const list = mk("ul", "palette-list");
    list.setAttribute("role", "listbox");
    dlg.append(input, list);
    document.body.append(dlg);

    let items = [];
    let active = 0;

    const sync = () => [...list.children].forEach((li, i) => {
      li.setAttribute("aria-selected", String(i === active));
      if (i === active) li.scrollIntoView({ block: "nearest" });
    });

    const run = cmd => {
      if (!cmd) return;
      dlg.close();
      cmd.run();
    };

    function render() {
      const q = input.value.trim().toLowerCase();
      const hasResult = !results.hidden && !!state.last;
      items = COMMANDS.filter(c =>
        (!c.needsResult || hasResult) && (!q || q.split(/\s+/).every(w => c.label.toLowerCase().includes(w)))
      );
      active = Math.min(active, Math.max(0, items.length - 1));
      list.replaceChildren();
      if (!items.length) { list.append(mk("li", "palette-empty", "No matching command")); return; }
      items.forEach((cmd, i) => {
        const li = mk("li", "palette-item");
        li.setAttribute("role", "option");
        li.append(mk("span", "", cmd.label), mk("kbd", "", cmd.tag));
        li.addEventListener("click", () => run(cmd));
        li.addEventListener("mousemove", () => { if (active !== i) { active = i; sync(); } });
        list.append(li);
      });
      sync();
    }

    input.addEventListener("input", () => { active = 0; render(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        sync();
      } else if (e.key === "Enter") {
        e.preventDefault();
        run(items[active]);
      }
    });
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

    return () => {
      if (dlg.open) { dlg.close(); return; }
      input.value = "";
      active = 0;
      render();
      dlg.showModal();
      input.focus();
    };
  }

  const togglePalette = buildPalette();
  $("#palette-open").addEventListener("click", togglePalette);
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      togglePalette();
    }
  });
})();
