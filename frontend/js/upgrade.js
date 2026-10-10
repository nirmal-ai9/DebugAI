(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const mk = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const form = $(".debug-form");
  const results = $("#results");
  const codeWindow = $(".code-window");
  const diffPanel = $(".code-diff", codeWindow);
  const exportBtn = $(".export-md-button");
  const HISTORY_KEY = "debugai:history:v1";
  const MAX_HISTORY = 12;
  const SEVERITIES = ["critical", "high", "medium", "low"];
  let last = null;

  /* ---------- toast ---------- */
  const toastEl = mk("div", "toast");
  toastEl.setAttribute("role", "status");
  document.body.append(toastEl);
  let toastTimer;
  function notify(text) {
    toastEl.textContent = text;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  }

  /* ---------- syntax highlighting ---------- */
  const KW = "async await break case catch class const continue default def del do elif else enum except export extends false finally fn for from function if impl import in interface lambda let match new nil none null package pass private public pub raise return self static struct super switch this throw true try type typeof undefined use var void while with yield";
  const BASE = String.raw`(\/\/.*|\/\*.*?\*\/|<!--.*?-->PY)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|` + "`(?:\\\\.|[^`\\\\])*`" + String.raw`)|\b(\d+(?:\.\d+)?)\b|\b(${KW.split(" ").join("|")})\b`;
  const TOKEN_C = new RegExp(BASE.replace("PY", ""), "g");
  const TOKEN_PY = new RegExp(BASE.replace("PY", String.raw`|(?:^|\s)#.*`), "g");

  function highlightLine(line, re) {
    const node = line.lastChild;
    if (!node || node.nodeType !== 3) return;
    const text = node.nodeValue;
    const out = document.createDocumentFragment();
    let i = 0;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (m.index > i) out.append(text.slice(i, m.index));
      out.append(mk("span", m[1] ? "tok-c" : m[2] ? "tok-s" : m[3] ? "tok-n" : "tok-k", m[0]));
      i = m.index + m[0].length;
    }
    if (i < text.length) out.append(text.slice(i));
    node.replaceWith(out);
  }

  function highlightFixed() {
    const re = /\.(py|rb|sh|ya?ml|toml)$/i.test(last?.filename ?? "") ? TOKEN_PY : TOKEN_C;
    codeWindow.querySelectorAll(".code-fix .code-line").forEach(line => highlightLine(line, re));
  }

  /* ---------- diff ---------- */
  function diffLines(a, b) {
    const A = a.split(/\r?\n/);
    const B = b.split(/\r?\n/);
    let s = 0;
    while (s < A.length && s < B.length && A[s] === B[s]) s++;
    let ea = A.length;
    let eb = B.length;
    while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }

    const x = A.slice(s, ea);
    const y = B.slice(s, eb);
    const n = x.length;
    const m = y.length;
    const ops = [];
    for (let i = 0; i < s; i++) ops.push({ t: " ", text: A[i] });

    if (n * m > 4e6) {
      x.forEach(text => ops.push({ t: "-", text }));
      y.forEach(text => ops.push({ t: "+", text }));
    } else {
      const w = m + 1;
      const L = new Uint32Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          L[i * w + j] = x[i] === y[j]
            ? L[(i + 1) * w + j + 1] + 1
            : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
        }
      }
      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (x[i] === y[j]) { ops.push({ t: " ", text: x[i] }); i++; j++; }
        else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) ops.push({ t: "-", text: x[i++] });
        else ops.push({ t: "+", text: y[j++] });
      }
      while (i < n) ops.push({ t: "-", text: x[i++] });
      while (j < m) ops.push({ t: "+", text: y[j++] });
    }

    for (let i = ea; i < A.length; i++) ops.push({ t: " ", text: A[i] });

    let na = 1;
    let nb = 1;
    for (const op of ops) {
      op.a = na;
      op.b = nb;
      if (op.t !== "+") na++;
      if (op.t !== "-") nb++;
    }
    return ops;
  }

  function collapse(ops, ctx = 3) {
    const keep = new Array(ops.length).fill(false);
    ops.forEach((op, i) => {
      if (op.t === " ") return;
      for (let k = Math.max(0, i - ctx); k <= Math.min(ops.length - 1, i + ctx); k++) keep[k] = true;
    });
    const out = [];
    let skipped = 0;
    ops.forEach((op, i) => {
      if (keep[i]) {
        if (skipped) { out.push({ gap: skipped }); skipped = 0; }
        out.push(op);
      } else skipped++;
    });
    if (skipped) out.push({ gap: skipped });
    return out;
  }

  function getDiff() {
    if (!last) return [];
    return (last.diff ||= diffLines(last.original, last.fixed));
  }

  function renderDiff() {
    if (!last || !last.fixed) return;
    const ops = getDiff();
    const added = ops.filter(o => o.t === "+").length;
    const removed = ops.filter(o => o.t === "-").length;
    const body = mk("div", "diff-body");
    collapse(ops).forEach(item => {
      if (item.gap) {
        body.append(mk("div", "diff-gap", `${item.gap} unchanged line${item.gap === 1 ? "" : "s"}`));
        return;
      }
      const row = mk("div", `diff-row${item.t === "+" ? " diff-add" : item.t === "-" ? " diff-del" : ""}`);
      row.append(
        mk("span", "diff-no", String(item.t === "-" ? item.a : item.b)),
        mk("span", "diff-sign", item.t === " " ? "" : item.t),
        mk("span", "diff-text", item.text)
      );
      body.append(row);
    });
    diffPanel.replaceChildren(mk("p", "diff-stat", `+${added}  \u2212${removed}`), body);
  }
  document.addEventListener("debugai:diff", renderDiff);

  /* ---------- markdown report ---------- */
  function download(name, text, type = "text/markdown;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = mk("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildReport() {
    const { data, filename } = last;
    const bugs = data.result.bugs ?? [];
    const out = [
      `# DebugAI report${filename ? ` \u2014 ${filename}` : ""}`,
      "",
      `_${new Date().toLocaleString()}_`,
      "",
      `**${bugs.length} issue${bugs.length === 1 ? "" : "s"} found**`,
      ""
    ];

    bugs.forEach((b, i) => {
      const meta = [`Type: ${b.type}`, `Line: ${b.line ?? "unknown"}`];
      if (b.severity) meta.push(`Severity: ${b.severity}`);
      if (Number.isFinite(b.confidence)) meta.push(`Confidence: ${Math.round(b.confidence * 100)}%`);
      out.push(`## ${i + 1}. ${b.message}`, "", meta.join(" \u00b7 "), "");
      if (b.why) out.push(`**Why:** ${b.why}`, "");
      if (b.explanation) out.push(`**Fix:** ${b.explanation}`, "");
      if (b.alsoCheck?.length) out.push("**Also check:**", ...b.alsoCheck.map(s => `- ${s}`), "");
      (b.unplaced ?? []).forEach(u => out.push("Apply by hand:", "", "````", u.code, "````", ""));
    });

    if (last.fixed && last.fixed !== last.original) {
      out.push("## Diff", "", "````diff");
      collapse(getDiff()).forEach(item => {
        out.push(item.gap ? `@@ ${item.gap} unchanged lines @@` : `${item.t}${item.text}`);
      });
      out.push("````", "");
    }
    return out.join("\n");
  }

  function exportReport() {
    if (!last) return;
    const base = (last.filename || "debugai").replace(/\.[^.]+$/, "");
    download(`${base}-report.md`, buildReport());
    notify("Report downloaded");
  }
  exportBtn.addEventListener("click", exportReport);

  /* ---------- summary strip ---------- */
  function renderSummary(detail) {
    $(".summary-strip", results)?.remove();
    const bugs = detail.data.result.bugs ?? [];
    if (!bugs.length) return;

    const strip = mk("div", "summary-strip");
    strip.append(mk("span", "summary-main", `${bugs.length} issue${bugs.length === 1 ? "" : "s"}`));
    SEVERITIES.forEach(level => {
      const count = bugs.filter(b => b.severity === level).length;
      if (count) strip.append(mk("span", `badge badge--${level}`, `${count} ${level}`));
    });
    const conf = bugs.map(b => b.confidence).filter(Number.isFinite);
    if (conf.length) {
      const avg = Math.round((conf.reduce((s, v) => s + v, 0) / conf.length) * 100);
      strip.append(mk("span", "badge badge--conf", `avg ${avg}% sure`));
    }
    const edits = detail.data.result.patches?.length ?? 0;
    if (edits) strip.append(mk("span", "summary-edits", `${edits} edit${edits === 1 ? "" : "s"} ready`));
    results.insertBefore(strip, $("#bug-list"));
  }

  /* ---------- history ---------- */
  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  };
  function saveHistory(list) {
    for (;;) {
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); return; }
      catch { if (list.length <= 1) return; list.pop(); }
    }
  }

  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
  }

  const countEl = $("#history-count");
  function updateCount() {
    const n = loadHistory().length;
    countEl.textContent = String(n);
    countEl.hidden = !n;
  }

  function addHistory(d) {
    const bugs = d.data.result.bugs ?? [];
    const list = loadHistory().filter(h => !(h.code === d.original && h.requirements === d.requirements));
    list.unshift({
      id: Date.now().toString(36),
      ts: Date.now(),
      filename: d.filename || "",
      title: bugs[0]?.message?.slice(0, 90) || "No bug found",
      count: bugs.length,
      requirements: d.requirements,
      code: d.original,
      error: d.error,
      data: d.data
    });
    saveHistory(list.slice(0, MAX_HISTORY));
    updateCount();
  }

  function setField(name, value) {
    const field = form.elements[name];
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function fill({ requirements, code, error }) {
    window.DebugAI.clearUpload();
    setField("requirements", requirements);
    setField("code", code);
    setField("err", error ?? "");
  }

  function buildHistory() {
    const backdrop = mk("div", "history-backdrop");
    const panel = mk("aside", "history");
    panel.setAttribute("aria-label", "Diagnosis history");
    panel.inert = true;

    const head = mk("header", "history-head");
    const close = mk("button", "history-close", "\u00d7");
    close.type = "button";
    close.setAttribute("aria-label", "Close history");
    head.append(mk("h2", "", "History"), close);

    const list = mk("ul", "history-list");
    const foot = mk("footer", "history-foot");
    const clear = mk("button", "history-clear", "Clear all");
    clear.type = "button";
    foot.append(mk("span", "", "Saved only in this browser"), clear);
    panel.append(head, list, foot);
    document.body.append(backdrop, panel);

    let opener = null;

    function render() {
      const items = loadHistory();
      list.replaceChildren();
      if (!items.length) {
        list.append(mk("li", "history-empty", "No diagnoses yet. Your results will appear here."));
        return;
      }
      items.forEach(entry => {
        const li = mk("li", "history-entry");
        const open = mk("button", "history-item");
        open.type = "button";
        open.append(
          mk("strong", "", entry.title),
          mk("span", "", `${entry.filename || "pasted code"} \u00b7 ${entry.count} issue${entry.count === 1 ? "" : "s"} \u00b7 ${timeAgo(entry.ts)}`)
        );
        open.addEventListener("click", () => {
          fill(entry);
          window.DebugAI.restore({ data: entry.data, code: entry.code, filename: entry.filename, requirements: entry.requirements, error: entry.error });
          hide(false);
        });
        const del = mk("button", "history-del", "\u00d7");
        del.type = "button";
        del.setAttribute("aria-label", "Delete this entry");
        del.addEventListener("click", () => {
          saveHistory(loadHistory().filter(h => h.id !== entry.id));
          updateCount();
          render();
        });
        li.append(open, del);
        list.append(li);
      });
    }

    function show() {
      opener = document.activeElement;
      render();
      panel.inert = false;
      panel.classList.add("is-open");
      backdrop.classList.add("is-open");
      close.focus();
    }

    function hide(restoreFocus = true) {
      panel.inert = true;
      panel.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      if (restoreFocus && opener?.focus) opener.focus();
    }

    close.addEventListener("click", () => hide());
    backdrop.addEventListener("click", () => hide());
    clear.addEventListener("click", () => {
      try { localStorage.removeItem(HISTORY_KEY); } catch { /* storage unavailable */ }
      updateCount();
      render();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && panel.classList.contains("is-open")) hide();
    });
    return { show, hide };
  }

  const history = buildHistory();
  $("#history-open").addEventListener("click", history.show);
  updateCount();

  /* ---------- sample bug ---------- */
  const SAMPLE = {
    requirements: "Each .item button should log its own index when clicked, and loadUser() should show the user's name in #name.",
    code: `const buttons = document.querySelectorAll(".item");
for (var i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", () => {
    console.log("Clicked item", i);
  });
}

async function loadUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  const user = res.json();
  document.querySelector("#name").textContent = user.name;
}`,
    error: "Clicked item 5  (same number for every button)\n#name shows \"undefined\""
  };

  function loadSample() {
    fill(SAMPLE);
    window.DebugAI.goToStep(0, { focus: false });
    $("#debug-tool").scrollIntoView({ behavior: "smooth" });
    notify("Sample loaded \u2014 press Continue, then Find the fix");
  }
  $("#sample-btn").addEventListener("click", loadSample);

  /* ---------- results hook ---------- */
  document.addEventListener("debugai:result", event => {
    const d = event.detail;
    last = { ...d };
    highlightFixed();
    renderSummary(d);
    exportBtn.hidden = false;
    if (!d.restored) addHistory(d);
  });

  /* ---------- command palette ---------- */
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
      const hasResult = !results.hidden && !!last;
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
