function buildBugCard(bug, index, total, patchById) {
  const card = el("article", "result-card result-card--bug bracket reveal is-visible");
  const head = el("div", "result-head");
  const icon = el("span", "result-icon");
  icon.setAttribute("aria-hidden", "true");
  head.append(icon);
  head.append(el("h3", "result-title", total > 1 ? `Bug ${index + 1} of ${total}` : "Bug found"));
  const badges = el("span", "badges");
  if (/^(critical|high|medium|low)$/.test(bug.severity)) badges.append(el("span", `badge badge--${bug.severity}`, bug.severity));
  if (Number.isFinite(bug.confidence)) badges.append(el("span", "badge badge--conf", `${Math.round(bug.confidence * 100)}% sure`));
  if (badges.childElementCount) head.append(badges);
  card.append(head);

  const meta = el("dl", "bug-meta");
  [["Type", bug.type], ["Line", bug.line ?? "Unknown"]].forEach(([k, v]) => {
    const item = el("div", "bug-meta-item");
    item.append(el("dt", "", k), el("dd", "", String(v)));
    meta.append(item);
  });
  card.append(meta, el("p", "bug-message", bug.message));

  if (bug.why) {
    card.append(el("h4", "bug-subhead", "Why"), el("p", "result-prose", bug.why));
  }
  if (bug.explanation) {
    card.append(el("h4", "bug-subhead", "Fix"), el("p", "result-prose", bug.explanation));
  }

  const also = (bug.alsoCheck ?? []).filter(s => typeof s === "string" && s.trim());
  if (also.length) {
    const list = el("ul", "also-list");
    also.forEach(s => list.append(el("li", "", s)));
    card.append(el("h4", "bug-subhead", "Also check"), list);
  }

  const placed = (bug.patchIds ?? []).map(id => patchById.get(id)).filter(Boolean);
  if (placed.length) {
    const tags = el("p", "bug-patches", `Edits: ${placed.map(rangeLabel).join(", ")}`);
    card.append(tags);
  }

  (bug.unplaced ?? []).forEach(item => {
    const box = el("div", "bug-manual");
    box.append(el("p", "fix-range", `Couldn't safely place this edit (${item.reason}). Apply by hand:`));
    box.append(el("pre", "bug-manual-code", item.code));
    card.append(box);
  });

  return card;
}

function showResult(data, { restored = false } = {}) {
  const result = data.result;
  const results = document.getElementById("results");
  const bugList = document.getElementById("bug-list");
  const fixCard = results.querySelector(".result-card--fix");
  const fixExplanation = fixCard.querySelector(".result-prose");
  const fixRange = fixCard.querySelector(".fix-range");
  const fixCode = fixCard.querySelector(".code-fix code");

  const bugs = Array.isArray(result.bugs) ? result.bugs : [];
  const patches = Array.isArray(result.patches) ? result.patches : [];
  const patchById = new Map(patches.map(p => [p.id, p]));

  bugList.replaceChildren();
  if (bugs.length) {
    bugs.forEach((bug, i) => bugList.append(buildBugCard(bug, i, bugs.length, patchById)));
  } else {
    const card = el("article", "result-card result-card--bug bracket reveal is-visible");
    const head = el("div", "result-head");
    head.append(el("h3", "result-title", "No bug found"));
    card.append(head, el("p", "bug-message", result.why || "No obvious bug was detected."));
    bugList.append(card);
  }

  let marks = [];
  currentFullCode = "";
  currentFixCode = "";
  fixRange.hidden = true;
  fixCard.hidden = !bugs.length;

  if (bugs.length) {
    const where = submitted.filename ? `: ${submitted.filename}` : "";
    const applied = patches.length ? applyPatches(submitted.code, patches) : null;

    if (applied) {
      currentFullCode = applied.text;
      marks = applied.marks;
      const n = applied.applied.length;
      fixExplanation.textContent = `${n} edit${n === 1 ? "" : "s"} applied across ${bugs.length} issue${bugs.length === 1 ? "" : "s"}.`;
      fixRange.textContent = `Complete fixed file${where} \u00b7 ${n} changed ${n === 1 ? "range" : "ranges"} highlighted`;
      fixRange.hidden = false;
      currentFixCode = currentFullCode;
    } else {
      // Never guess a position: a misplaced fix would corrupt the file.
      currentFixCode = bugs.flatMap(b => b.unplaced ?? []).map(u => u.code).join("\n\n");
      fixExplanation.textContent = "Couldn't safely place the fixes in your file. Apply the snippets by hand.";
    }
  }

  renderCodeLines(fixCode, currentFixCode, 1, marks);
  resetCodeWindow(currentFullCode);
  copyBtn.disabled = !currentFixCode;
  downloadBtn.hidden = !currentFullCode;
  const firstChanged = fixCode.querySelector(".is-changed");

  results.hidden = false;
  results.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));

  results.scrollIntoView({ behavior: "smooth", block: "start" });
  if (resultsHeading) resultsHeading.focus({ preventScroll: true });

  if (firstChanged) {
    codePanel.scrollTop = Math.max(0, firstChanged.offsetTop - codePanel.clientHeight / 3);
  }

  document.dispatchEvent(new CustomEvent("debugai:result", {
    detail: {
      data,
      restored,
      original: submitted.code,
      fixed: currentFullCode,
      filename: submitted.filename,
      requirements: submitted.requirements ?? "",
      error: submitted.error ?? ""
    }
  }));
}

const copyBtn = document.querySelector(".apply-fix-actions .apply-fix-button:not(.download-fix-button)");
const COPY_LABEL = copyBtn.textContent;

