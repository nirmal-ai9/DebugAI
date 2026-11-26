(() => {
  const state = window.DebugAIUpgrade;
  const { $, mk, form, HISTORY_KEY, MAX_HISTORY, notify } = state;
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
  state.history = history;
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
  state.fill = fill;
  state.loadSample = loadSample;
  $("#sample-btn").addEventListener("click", loadSample);

  /* ---------- results hook ---------- */
  document.addEventListener("debugai:result", event => {
    const d = event.detail;
    state.last = { ...d };
    state.highlightFixed();
    state.renderSummary(d);
    state.exportBtn.hidden = false;
    if (!d.restored) addHistory(d);
  });

  /* ---------- command palette ---------- */
})();
