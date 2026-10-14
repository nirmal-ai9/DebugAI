// Raw fixed file (or manual snippets), kept apart from the numbered markup so copy and preview stay clean.
let currentFixCode = "";
// The whole file with every patch applied.
let currentFullCode = "";

// The model often drops leading indentation; restore the original line's.
function reindent(source, patch) {
  const code = patch.code ?? "";
  const original = source.split(/\r?\n/)[patch.startLine - 1];
  if (!code || original === undefined) return code;

  const indent = original.match(/^[\t ]*/)[0];
  const lines = code.split(/\r?\n/);
  const widths = lines.filter(l => l.trim()).map(l => l.match(/^[\t ]*/)[0].length);
  const min = widths.length ? Math.min(...widths) : 0;
  if (min >= indent.length) return code;

  return lines.map(l => (l.trim() ? indent + l.slice(min) : l)).join("\n");
}

// Every patch refers to line numbers in the ORIGINAL file. Apply bottom -> top so
// earlier splices never shift later ones, and map highlights to the new numbering.
function applyPatches(source, patches) {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);

  const valid = patches
    .filter(p => Number.isInteger(p.startLine) && Number.isInteger(p.endLine) &&
      p.startLine >= 1 && p.endLine >= p.startLine && p.endLine <= lines.length)
    .sort((a, b) => a.startLine - b.startLine);

  const accepted = [];
  for (const p of valid) {
    const last = accepted[accepted.length - 1];
    if (last && p.startLine <= last.endLine) continue; // overlap: never guess
    const code = reindent(source, p);
    accepted.push({
      ...p,
      replacement: code ? code.replace(/\r?\n$/, "").split(/\r?\n/) : []
    });
  }

  if (!accepted.length) return null;

  const marks = [];
  let delta = 0;
  for (const p of accepted) {
    const count = p.replacement.length;
    if (count) marks.push({ from: p.startLine + delta, to: p.startLine + delta + count - 1 });
    delta += count - (p.endLine - p.startLine + 1);
  }

  for (let i = accepted.length - 1; i >= 0; i--) {
    const p = accepted[i];
    lines.splice(p.startLine - 1, p.endLine - p.startLine + 1, ...p.replacement);
  }

  return { text: lines.join(eol), marks, applied: accepted.map(p => p.id) };
}

function renderCodeLines(codeElement, source, firstLine = 1, marks = []) {
  const lines = source ? source.replace(/\r?\n$/, "").split(/\r?\n/) : [];
  const fragment = document.createDocumentFragment();

  lines.forEach((text, index) => {
    const line = document.createElement("span");
    line.className = "code-line";
    const n = firstLine + index;
    if (marks.some(m => n >= m.from && n <= m.to)) line.classList.add("is-changed");

    const number = document.createElement("span");
    number.className = "line-num";
    number.textContent = n;

    line.append(number, text);
    fragment.append(line);
  });

  codeElement.style.setProperty("--gutter-digits", String(firstLine + lines.length - 1).length);
  codeElement.replaceChildren(fragment);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function rangeLabel(p) {
  return p.startLine === p.endLine ? `line ${p.startLine}` : `lines ${p.startLine}\u2013${p.endLine}`;
}

