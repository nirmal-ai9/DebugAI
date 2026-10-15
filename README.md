# DebugAI
 
**Find the mismatch, not just the error.**
 
DebugAI is an AI-powered code-diagnosis tool. It compares what your code is **supposed to do**, the **code itself**, and the **console output** to explain likely bugs and suggest targeted fixes. It does not execute submitted code.
 
[Try DebugAI](https://nirmal-ai9.github.io/DebugAI/) · [Report a bug](https://github.com/nirmal-ai9/DebugAI/issues) · [About](https://nirmal-ai9.github.io/DebugAI/about.html)
 
## Features
 
- **Three-step diagnosis:** describe the intended behavior, paste or upload source code, and optionally include a console error.
- **Multiple findings:** bugs include a type, line reference, explanation, severity, confidence, and additional checks where available.
- **Targeted patches:** applies supported line-range patches to the original source rather than replacing the whole file. Ambiguous changes are kept as manual snippets.
- **Review before using:** inspect the fixed code, compare a diff, or preview eligible HTML in a sandboxed frame.
- **Export options:** copy the fix, download the complete fixed file, or export the diagnosis and diff as Markdown.
- **Local history:** saves up to 12 recent diagnoses in browser storage so they can be restored later.
- **Command palette:** press `Ctrl+K` / `Cmd+K` to access common actions.
- **Sample diagnosis:** explore the workflow without preparing your own code.
- **Theme and effects:** switch between light and dark themes and toggle the matrix-rain effect.
- **Interactive landing page:** explore the intent/code/console triangle, JavaScript closure demo, and debugging challenge.
- **Bug Hunt:** play the standalone 30-second mini-game.
- **Informational pages:** About, Privacy, License, and custom 404 pages.

 
## Tech stack
 
### Frontend
 
- Semantic HTML and modular CSS
- Vanilla JavaScript (no frontend framework or build step)
- Browser APIs for local history, clipboard, file handling, downloads, and the HTML preview
- GitHub Pages deployment through GitHub Actions

 
### Backend
 
- JavaScript running on Cloudflare Workers
- [Hono](https://hono.dev/) for request routing
- Cloudflare Workers AI using `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Zod dependency in the backend project

 
The backend splits large inputs into overlapping line windows, analyses sections, and merges/de-duplicates findings. It returns structured bug data and line-range patches for the frontend to review and apply.
 
## Repository structure
 
```text
.
├── .github/
│   └── workflows/
│       ├── codeql.yml          # CodeQL security scanning
│       └── deploy.yml          # Deploy frontend to GitHub Pages
├── backend/
│   ├── src/index.js            # Worker API and AI diagnosis logic
│   ├── package.json
│   ├── package-lock.json
│   └── wrangler.jsonc          # Cloudflare Worker configuration
├── frontend/
│   ├── index.html              # Main debugging tool and landing page
│   ├── about.html
│   ├── bughunt.html
│   ├── privacy.html
│   ├── license.html
│   ├── 404.html
│   ├── css/                    # Base, layout, landing, form, and result styles
│   ├── js/
│   │   ├── wizard.js           # Multi-step form and API request flow
│   │   ├── analysis.js         # Source-file selection and upload handling
│   │   ├── results/            # Bug cards, patching, copy/download/preview actions
│   │   ├── upgrade/            # Diff view, history, report export, command palette
│   │   ├── interactive/        # Landing-page demos and challenge
│   │   ├── bughunt/            # Bug Hunt game logic and configuration
│   │   ├── effects.js          # Theme/effects and page enhancements
│   │   ├── terminal.js         # Hidden landing-page terminal
│   │   └── theme-init.js       # Prevents theme flash on page load
│   ├── logo/
│   ├── manifest.json
│   ├── robots.txt
│   └── sitemap.xml
├── LICENSE
└── README.md
```
 
## Run locally
 
You need Node.js/npm and a Cloudflare account for the Workers AI backend.
 
### 1. Start the backend
 
```bash
cd backend
npm install
npx wrangler login
npx wrangler dev
```
 
The local Worker runs at `http://localhost:8787`. Workers AI access requires a suitably configured Cloudflare account.
 
### 2. Serve the frontend
 
In a second terminal:
 
```bash
cd frontend
python -m http.server 8000
```
 
Open `http://localhost:8000`. The frontend selects the local Worker automatically when served from `localhost` or `127.0.0.1`; otherwise it uses the configured production Worker endpoint.
 
## Input limits and safeguards
 
Current backend limits are:
 

|Input|Limit|
|---|---:|
|Requirements / intended behavior|4,000 characters|
|Source code|20,000 characters|
|Console error|8,000 characters|
|Uploaded file|600 KiB|
 
The backend rate-limits requests and restricts cross-origin requests to the production site and local development origins. The frontend rejects unsupported file types and binary-looking uploads. HTML previews run in a sandboxed frame.
 
**Important:** AI-generated diagnoses and patches can be wrong. Review every suggested change and test it in your own environment before relying on it. DebugAI reads submitted code; it does not execute it as part of diagnosis.
 
## Deployment
 
- **Frontend:** pushes to `main` deploy the `frontend/` directory to GitHub Pages through `.github/workflows/deploy.yml`.
- **Security scanning:** CodeQL is configured through `.github/workflows/codeql.yml`.
- **Backend:** deploy from `backend/` with `npx wrangler deploy` after configuring Cloudflare credentials and Worker settings.

 
## Contributing
 
Contributions and bug reports are welcome. Please open an issue to discuss substantial changes, or submit a pull request with a clear description of the problem and how you tested the fix.
 
## License
 
DebugAI is licensed under the GNU General Public License v3.0.
