(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = "debugai.history";
  const results = $("#results");
  const win = $(".code-window");
  const bar = $(".view-toggle", win);
  const actions = $(".apply-fix-actions");
  let last = null;

  const store = {
    read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } },
    write(v) { try { localStorage.setItem(KEY, JSON.stringify(v.slice(0, 12))); } catch {} }
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // ---------- Syntax highlighting ----------
  const TOKEN = /(\/\/.*|#.*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(\d+\.?\d*)\b|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|new|this|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|def|self|None|True|False|elif|lambda|pass|with|as|yield|public|private|static|void|int|string|bool)\b/g;
  function highlight(codeEl) {
    codeEl.querySelectorAll(".code-line").forEach(line => {
      const node = line.lastChild;
      if (!node || node.nodeType !== 3) return;
      const text = node.nodeValue, frag = document.createDocumentFragment();
      let i = 0, m;
      TOKEN.lastIndex = 0;
      while ((m = TOKEN.exec(text))) {
        if (m.index > i) frag.append(text.slice(i, m.index));
        const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-n" : "tk-k";
        frag.append(el("span", cls, m[0]));
        i = m.index + m[0].length;
      }
      frag.append(text.slice(i));
      line.replaceChild(frag, node);
    });
  }

  // ---------- Diff ----------
  function diffLines(a, b) {
    let s = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    let ea = a.length, eb = b.length;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const x = a.slice(s, ea), y = b.slice(s, eb), out = [];
    a.slice(0, s).forEach((t, i) => out.push([" ", t, i + 1]));
    if (x.length * y.length > 4e6) {
      x.forEach((t, i) => out.push(["-", t, s + i + 1]));
      y.forEach(t => out.push(["+", t, null]));
    } else {
      const L = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
      for (let i = x.length - 1; i >= 0; i--)
        for (let j = y.length - 1; j >= 0; j--)
          L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      let i = 0, j = 0;
      while (i < x.length || j < y.length) {
        if (i < x.length && j < y.length && x[i] === y[j]) { out.push([" ", x[i], s + i + 1]); i++; j++; }
        else if (j < y.length && (i === x.length || L[i][j + 1] >= L[i + 1][j])) out.push(["+", y[j++], null]);
        else out.push(["-", x[i], s + i + 1]), i++;
      }
    }
    a.slice(ea).forEach((t, i) => out.push([" ", t, ea + i + 1]));
    return out;
  }

  const diffPane = el("pre", "code-diff");
  diffPane.hidden = true;
  win.append(diffPane);
  const diffBtn = el("button", "view-toggle-option", "Diff");
  diffBtn.type = "button";
  diffBtn.dataset.view = "diff";
  diffBtn.setAttribute("aria-pressed", "false");
  bar.append(diffBtn);

  function renderDiff() {
    const before = (window.submitted?.code ?? submitted.code).split(/\r?\n/);
    const after = (currentFullCode || "").split(/\r?\n/);
    const frag = document.createDocumentFragment();
    const rows = diffLines(before, after);
    const keep = new Set();
    rows.forEach((r, i) => { if (r[0] !== " ") for (let k = i - 3; k <= i + 3; k++) keep.add(k); });
    let skipped = 0;
    rows.forEach((r, i) => {
      if (!keep.has(i)) { skipped++; return; }
      if (skipped) { frag.append(el("span", "diff-gap", `\u22ef ${skipped} unchanged lines`)); skipped = 0; }
      const row = el("span", `diff-row diff-${r[0] === "+" ? "add" : r[0] === "-" ? "del" : "ctx"}`);
      row.append(el("span", "line-num", r[2] ?? ""), el("span", "diff-sign", r[0]), r[1] || " ");
      frag.append(row);
    });
    if (skipped) frag.append(el("span", "diff-gap", `\u22ef ${skipped} unchanged lines`));
    diffPane.replaceChildren(frag);
  }

  diffBtn.addEventListener("click", () => {
    if (!currentFullCode) return;
    $(".code-fix", win).hidden = true;
    $(".code-preview", win).hidden = true;
    bar.querySelectorAll(".view-toggle-option").forEach(b => b.setAttribute("aria-pressed", String(b === diffBtn)));
    renderDiff();
    diffPane.hidden = false;
  });
  const baseSetView = window.setView;
  window.setView = function (view) {
    diffPane.hidden = true;
    diffBtn.setAttribute("aria-pressed", "false");
    return baseSetView(view);
  };

  // ---------- Result enrichment ----------
  function badges(result) {
    $(".upgrade-badges")?.remove();
    $(".also-check")?.remove();
    const card = $(".result-card--bug", results);
    const row = el("div", "upgrade-badges");
    if (result.severity) row.append(el("span", `badge badge--${result.severity}`, result.severity));
    if (Number.isFinite(result.confidence)) {
      const c = Math.round(result.confidence <= 1 ? result.confidence * 100 : result.confidence);
      const meter = el("span", "badge badge--meter", `${c}% confident`);
      meter.style.setProperty("--pct", `${c}%`);
      row.append(meter);
    }
    if (row.children.length) $(".result-head", card).after(row);
    if (result.alsoCheck?.length) {
      const box = el("div", "also-check");
      box.append(el("strong", "", "Also worth checking"));
      const ul = el("ul");
      result.alsoCheck.slice(0, 3).forEach(t => ul.append(el("li", "", t)));
      box.append(ul);
      card.append(box);
    }
  }

  function toMarkdown(d) {
    const r = d.result, f = r.fix;
    const lang = (submitted.filename.split(".").pop() || "").toLowerCase();
    return [
      `# DebugAI diagnosis${submitted.filename ? ` \u2014 ${submitted.filename}` : ""}`,
      r.bug ? `**${r.bug.type}** at line ${r.bug.line ?? "?"}: ${r.bug.message}` : "No bug found.",
      r.severity ? `Severity: ${r.severity}` : "",
      `## Why\n${r.why ?? ""}`,
      f ? `## Fix\n${f.explanation}\n\n\`\`\`${lang}\n${f.code ?? ""}\n\`\`\`` : ""
    ].filter(Boolean).join("\n\n");
  }

  const exportBtn = el("button", "apply-fix-button apply-fix-button--ghost", "Export report (.md)");
  exportBtn.type = "button";
  exportBtn.addEventListener("click", () => {
    if (!last) return;
    const url = URL.createObjectURL(new Blob([toMarkdown(last)], { type: "text/markdown" }));
    const a = el("a");
    a.href = url; a.download = "debugai-report.md";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  actions.append(exportBtn);

  const baseShow = window.showResult;
  window.showResult = function (data) {
    baseShow(data);
    last = data;
    badges(data.result);
    highlight($(".code-fix code", win));
    diffBtn.disabled = !currentFullCode;
    if (data.result.bug) {
      const f = document.getElementById("debug-tool").querySelector("form").elements;
      const h = store.read();
      h.unshift({
        t: Date.now(), data, filename: submitted.filename, code: submitted.code,
        req: f.requirements.value, err: f.err.value
      });
      store.write(h);
      renderHistory();
    }
  };

  // ---------- History drawer ----------
  const drawer = el("aside", "history-drawer");
  drawer.hidden = true;
  drawer.setAttribute("aria-label", "Diagnosis history");
  document.body.append(drawer);
  function renderHistory() {
    const h = store.read();
    const head = el("div", "history-head");
    const close = el("button", "history-close", "\u00d7");
    close.type = "button"; close.setAttribute("aria-label", "Close history");
    close.onclick = () => (drawer.hidden = true);
    head.append(el("strong", "", "History"), close);
    const list = el("ul", "history-list");
    if (!h.length) list.append(el("li", "history-empty", "No diagnoses yet."));
    h.forEach((e, idx) => {
      const li = el("li"), b = el("button", "history-item");
      b.type = "button";
      b.append(
        el("span", "history-title", `${e.data.result.bug?.type ?? "Result"}${e.filename ? ` \u00b7 ${e.filename}` : ""}`),
        el("span", "history-sub", new Date(e.t).toLocaleString())
      );
      b.onclick = () => restore(idx);
      li.append(b); list.append(li);
    });
    const clear = el("button", "apply-fix-button apply-fix-button--ghost", "Clear history");
    clear.type = "button";
    clear.onclick = () => { store.write([]); renderHistory(); };
    drawer.replaceChildren(head, list, clear);
  }
  function restore(i) {
    const e = store.read()[i];
    if (!e) return;
    const f = $(".debug-form").elements;
    f.requirements.value = e.req; f.code.value = e.code; f.err.value = e.err;
    [f.requirements, f.code, f.err].forEach(n => n.dispatchEvent(new Event("input")));
    submitted = { code: e.code, filename: e.filename || "" };
    drawer.hidden = true;
    window.showResult(e.data);
  }
  const histBtn = el("button", "nav-link nav-history", "History");
  histBtn.type = "button";
  histBtn.onclick = () => { renderHistory(); drawer.hidden = !drawer.hidden; };
  $(".nav-links")?.prepend(histBtn);

  // ---------- Sample bug ----------
  function loadSample() {
    const f = $(".debug-form").elements;
    f.requirements.value = "Clicking a button should log its own index.";
    f.code.value = "const buttons = document.querySelectorAll('button');\nfor (var i = 0; i < buttons.length; i++) {\n  buttons[i].addEventListener('click', () => {\n    console.log('clicked', i);\n  });\n}";
    f.err.value = "Always logs: clicked 3";
    [f.requirements, f.code, f.err].forEach(n => n.dispatchEvent(new Event("input")));
    goToStep(0, { focus: false });
    $("#debug-tool").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- Command palette ----------
  const cmds = [
    ["Debug something", () => $("#debug-tool").scrollIntoView({ behavior: "smooth" })],
    ["Load sample bug", loadSample],
    ["Open history", () => { renderHistory(); drawer.hidden = false; }],
    ["Export last report", () => exportBtn.click()],
    ["Toggle theme", () => $("#theme-toggle-btn")?.click()],
    ["Toggle matrix rain", () => $("#rain-toggle-btn")?.click()],
    ["Go: How it works", () => $("#how-it-works").scrollIntoView({ behavior: "smooth" })],
    ["Go: Beat the diagnostic", () => $("#challenge-demo").scrollIntoView({ behavior: "smooth" })],
    ["Go: Bug Hunt game", () => (location.href = "bughunt.html")],
    ["Go: About", () => (location.href = "about.html")]
  ];
  const pal = el("div", "palette");
  pal.hidden = true;
  pal.innerHTML = '<div class="palette-box" role="dialog" aria-label="Command palette"><input class="palette-input" placeholder="Type a command\u2026" aria-label="Command" /><ul class="palette-list"></ul></div>';
  document.body.append(pal);
  const pin = $(".palette-input", pal), plist = $(".palette-list", pal);
  let sel = 0, shown = cmds;

  function paint() {
    plist.replaceChildren(...shown.map((c, i) => {
      const li = el("li", i === sel ? "is-sel" : "", c[0]);
      li.onclick = () => run(i);
      return li;
    }));
  }
  function run(i) { const c = shown[i]; closePal(); c?.[1](); }
  function openPal() { pal.hidden = false; pin.value = ""; shown = cmds; sel = 0; paint(); pin.focus(); }
  function closePal() { pal.hidden = true; }
  pin.addEventListener("input", () => {
    const q = pin.value.toLowerCase().replace(/\s+/g, "");
    shown = cmds.filter(c => { let k = 0; for (const ch of c[0].toLowerCase()) if (ch === q[k]) k++; return k === q.length; });
    sel = 0; paint();
  });
  pin.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") sel = Math.min(shown.length - 1, sel + 1);
    else if (e.key === "ArrowUp") sel = Math.max(0, sel - 1);
    else if (e.key === "Enter") return run(sel);
    else return;
    e.preventDefault(); paint();
  });
  pal.addEventListener("click", e => { if (e.target === pal) closePal(); });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
    else if (e.key === "Escape") { closePal(); drawer.hidden = true; }
  });

  // "Try a sample" link in the wizard
  const sample = el("button", "wizard-sample", "Try a sample bug");
  sample.type = "button";
  sample.onclick = loadSample;
  $(".wizard-actions")?.prepend(sample);
  renderHistory();
})();
