# &gt;_ DebugAI

**Paste what broke. Get the fix, not a lecture.**

DebugAI takes three things — what your code was *supposed* to do, the code itself, and the console error — and finds the mismatch between them. It doesn't run your code; it reads it, the way a senior engineer would when you paste a bug into slack.

## How it works

1. Describe what the code should do
2. Paste the code (any language)
3. Paste the console error, if there is one
4. DebugAI returns the bug, why it happens, and a fix you can copy

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Static HTML/CSS/JS, deployed on GitHub Pages |
| Backend | Cloudflare Workers |
| AI | Workers AI (`@cf/meta/llama-3.1-8b-instruct`) with JSON Mode for structured output |

## Response shape

The backend always returns a consistent, structured response:

```json
{
  "success": true,
  "result": {
    "bug": {
      "type": "ReferenceError",
      "line": 2,
      "message": "saveData is not defined"
    },
    "why": "The function is called but isn't defined.",
    "fix": {
      "explanation": "Define saveData before calling it.",
      "code": "function saveData() {}"
    }
  }
}
```

On failure, `success` is `false` and a human-readable `message` explains what went wrong.

## Project structure

```
DebugAI/
├── .github/workflows/deploy.yml  # CI/CD deployment
├── backend/                       # Cloudflare Workers API
│   ├── src/index.js
│   ├── package.json
│   └── wrangler.jsonc
└── frontend/                      # Modular UI
    ├── css/                       # Component styles & tokens
    └── index.html
```

## Running locally

**Backend**

```bash
cd backend
npx wrangler dev
```

**Frontend**

Just open `frontend/index.html` in a browser, or serve it with any static server. Update the `fetch()` URL in `script.js` to point at your local or deployed Worker.

## Deploying

**Backend** — deploys manually via Wrangler:

```bash
cd backend
npx wrangler deploy
```

**Frontend** — deploys automatically to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`).

## Status

Actively built, working end-to-end: form → Worker → Workers AI → structured diagnosis → rendered result.

## Author : Nirmal

<div align="center">
  <a href="https://nirmal-ai9.github.io/portfolio/"><img src="https://img.shields.io/badge/Portfolio-View-1a1a2e?style=for-the-badge" alt="Portfolio" /></a>
</div>
