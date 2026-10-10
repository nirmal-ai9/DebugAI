## Why I Built DebugAI

Debugging used to eat up way too much of my dev time. Staring at stack traces for hours just to find a missing bracket or a subtle logic bug was exhausting. I wanted a tool that felt fast, smart, and actually fun to use, so I built **DebugAI**.

Most debuggers only look at the code. DebugAI compares three things: what the code was **supposed to do**, the **code itself**, and what the **console** says. It finds where they disagree, explains why, and hands back a fix you can paste straight into your file.

## What It Does

- **Three-step input:** describe the intent, add the code (paste it or upload/drop a file), and optionally add the console error.
- **Multiple bugs per run:** every distinct bug is reported with its type, line, cause, and explanation.
- **Line-range patches:** the AI returns small edits instead of rewriting your file. The frontend applies them to your original source and highlights every changed range.
- **Safe placement:** if an edit can't be placed with confidence, it is shown as a manual snippet instead of risking a corrupted file.
- **Copy or download:** copy the fix, or download the complete fixed file.
- **HTML preview:** fixed HTML can be previewed in a sandboxed frame.
- **Severity and confidence:** every bug is ranked critical to low, with a confidence score and related things to check.
- **Diff view:** see exactly what changed, with syntax-highlighted code.
- **History:** your last 12 diagnoses are saved in your browser and can be restored in one click.
- **Command palette:** press `Ctrl K` (or `Cmd K`) for quick actions.
- **Markdown report:** export the full diagnosis and diff as a `.md` file.
- **Sample bug:** try the tool instantly without writing any code.
- **Dark / light theme** and an optional matrix-rain background.
- **Bug Hunt:** a 30-second whack-a-bug mini-game, plus a hidden terminal on the landing page.

## A Frontend with Personality

I didn't want this to look like another generic admin dashboard. The UI is clean and retro-inspired, with a terminal feel, code windows, and subtle glitch effects. Result cards follow the same theme tokens as the rest of the site, so they work in both dark and light mode.

It stays lightweight: plain HTML, CSS, and vanilla JavaScript with no framework and no build step.

| File | Job |
| --- | --- |
| `script.js` | Wizard form, file upload, API call, patch application, result rendering |
| `upgrade.js` | Diff view, highlighting, history, command palette, report export |
| `effects.js` | Theme switcher, matrix rain, scroll reveal |
| `interactive.js` | Landing page demos (triangle, closure, challenge) |
| `terminal.js` | Hidden terminal commands |
| `bughunt.js` | Bug Hunt game |
| `theme-init.js` | Applies the saved theme before first paint |

## Speed First: The Tech Stack

The backend is a single Cloudflare Worker in plain JavaScript, using **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) with structured JSON output.

- Large files are split into overlapping line windows and analysed in parallel.
- Results are merged, de-duplicated, and every patch is located against the original lines (exact match first, then a strict fuzzy match).
- Requests are rate limited to 10 per minute per IP.
- CORS only allows the production site and `localhost`.
- Input limits: requirements 4,000 characters, code 20,000, console error 8,000. Uploads are capped at 600 KB.

## Deployment

- **Frontend:** every push to `main` deploys `frontend/` to GitHub Pages through GitHub Actions (`deploy.yml`). CodeQL scans run on pushes, pull requests, and weekly.
- **Backend:** deployed manually from `backend/` with `npx wrangler deploy`.

## Want to Run It Yourself?

Getting DebugAI running locally takes a couple of minutes:

- **Backend:** in `backend/`, run `npm install`, then `npx wrangler dev`. It serves on `http://localhost:8787`. Workers AI needs a Cloudflare account, so log in with `npx wrangler login` first.
- **Frontend:** it is purely static. In `frontend/`, run any simple server, like `npx serve .` or `python -m http.server`. On `localhost` it automatically talks to the local worker.

## Let's Build Together

DebugAI is an evolving project. Whether you want to add new visual effects, improve the patching logic, or fix an edge-case bug, I'd love your help. Feel free to jump into the code and open a pull request.

## License

DebugAI is open source under the [GNU v3.0 License](LICENSE). A plain-English summary lives on the site's [License page](https://nirmal-ai9.github.io/DebugAI/license.html).
