<div align="center">

# DebugAI

**Find the mismatch, not just the error.**

An AI-powered debugging tool that compares what your code should do, what it actually does, and what the console reports — then helps you review a targeted fix.

[**Open DebugAI**](https://nirmal-ai9.github.io/DebugAI/) · [Report an issue](https://github.com/nirmal-ai9/DebugAI/issues) · [About](https://nirmal-ai9.github.io/DebugAI/about.html)

</div>

---

## What is DebugAI?

DebugAI helps you investigate bugs by looking at three pieces of context together:

1. **Intent** — describe what the code is supposed to do.
2. **Code** — paste your source or upload a supported code file.
3. **Console error** — optionally provide the error or output you received.

The backend sends the supplied context to an AI model and returns structured findings, explanations, and suggested patches. DebugAI does **not** execute submitted code during diagnosis.

## Features

- **Step-by-step input:** provide requirements, source code, and an optional console error in a guided workflow.
- **Structured findings:** review each detected issue with its type, line reference, explanation, severity, and confidence.
- **Targeted patches:** suggested edits identify the original line range and replacement code instead of blindly replacing the entire file.
- **Review before applying:** inspect the proposed fix, compare changes, and review eligible HTML in a sandboxed preview.
- **Export your work:** copy fixed code, download the updated file, or export a Markdown diagnosis report.
- **Local diagnosis history:** revisit recent results stored in your browser.
- **Command palette:** use `Ctrl + K` / `Cmd + K` for quick actions.
- **Sample diagnosis:** explore the workflow with a built-in example.
- **Theme controls:** switch themes and toggle visual effects.
- **Developer side quests:** explore the interactive Chaos page and the 30-second Bug Hunt mini-game.
- **Project information:** read the About, Privacy, and License pages.

## How it works

```text
Your intent + Source code + Optional console error
                       |
                       v
              DebugAI frontend
                       |
                       v
             Cloudflare Worker API
                       |
                       v
              Cloudflare Workers AI
                       |
                       v
       Structured findings and patch suggestions
                       |
                       v
          Review, compare, copy, or download
```

For larger source files, the backend splits the code into overlapping line-based chunks, analyses each chunk, and merges the findings. Suggested patches are matched against the original source before they are presented to the frontend.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Hosting | GitHub Pages |
| Backend | JavaScript on Cloudflare Workers |
| AI | Cloudflare Workers AI — `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Backend dependencies | Hono, Zod, Wrangler |

The frontend has no framework or build step. The browser handles interface interactions, local history, file selection, clipboard actions, downloads, and the sandboxed HTML preview.

## Repository structure

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
│       ├── codeql.yml
│       └── deploy.yml
├── backend/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   ├── package-lock.json
│   └── wrangler.jsonc
├── frontend/
│   ├── index.html
│   ├── about.html
│   ├── bughunt.html
│   ├── chaos.html
│   ├── privacy.html
│   ├── license.html
│   ├── 404.html
│   ├── css/
│   │   ├── base/
│   │   ├── bughunt/
│   │   ├── form/
│   │   ├── landing/
│   │   └── results/
│   ├── js/
│   │   ├── bughunt/
│   │   ├── results/
│   │   └── upgrade/
│   ├── logo/
│   ├── manifest.json
│   ├── robots.txt
│   └── sitemap.xml
├── LICENSE
└── README.md
```

## Run locally

### Requirements

- [Node.js](https://nodejs.org/) and npm
- A Cloudflare account with Workers AI available
- Python 3 (or another static HTTP server) to serve the frontend

### 1. Start the backend

```bash
cd backend
npm install
npx wrangler login
npx wrangler dev
```

The local Worker is available at:

```text
http://localhost:8787
```

The Worker uses a Cloudflare AI binding and a rate-limit binding configured in `wrangler.jsonc`. Make sure your Cloudflare account and local Wrangler setup have the required access.

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

When the frontend is opened on `localhost` or `127.0.0.1`, it sends diagnosis requests to the local Worker at `http://localhost:8787`. On the deployed site, it uses the production Worker endpoint.

## Current input limits

| Input | Maximum |
| --- | ---: |
| Intended behavior / requirements | 4,000 characters |
| Source code | 20,000 characters |
| Console error | 8,000 characters |
| Uploaded file | 600 KiB |

The backend also applies a request rate limit of **10 requests per 60 seconds per client IP, per Cloudflare location**.

## Safety and privacy notes

- Submitted code is analysed as text; DebugAI does not run it as part of diagnosis.
- Recent diagnosis history is stored locally in your browser.
- Eligible HTML previews are displayed in a sandboxed iframe.
- The backend restricts cross-origin requests to the production site and local development origins.
- AI-generated explanations and patches can be incorrect. Always review suggested changes and test them in your own environment before relying on them.

For more information, see the [Privacy Policy](https://nirmal-ai9.github.io/DebugAI/privacy.html).

## Deployment

### Frontend

Pushing to the `main` branch triggers the GitHub Actions workflow at `.github/workflows/deploy.yml`. It publishes the `frontend/` directory to GitHub Pages.

### Backend

From the `backend/` directory, deploy the Worker with:

```bash
npx wrangler deploy
```

Configure Cloudflare authentication and the required Workers AI and rate-limit bindings before deployment.

The repository also includes a CodeQL workflow for automated code scanning.

## Contributing

Bug reports and thoughtful improvements are welcome.

- [Open an issue](https://github.com/nirmal-ai9/DebugAI/issues)
- [Browse existing issues](https://github.com/nirmal-ai9/DebugAI/issues)
- [View the source code](https://github.com/nirmal-ai9/DebugAI)

For substantial changes, opening an issue first helps keep the discussion focused.

## License

DebugAI is licensed under the **GNU General Public License v3.0**. See [`LICENSE`](LICENSE) for the full license text.

---

<div align="center">

Built by **[Nirmal](https://github.com/nirmal-ai9)**

</div>
