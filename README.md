>_ DebugAI

Paste what broke. Get the fix, not a lecture.

DebugAI is an AI-powered code debugging tool that analyzes your requirements, code, and errors to identify bugs and suggest fixes.

How It Works

1. Describe what your code should do
2. Paste your code
3. Add the error, if available
4. Get the cause, explanation, and suggested fix

Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Cloudflare Workers
- AI: Workers AI
- Hosting: GitHub Pages

Project Structure

DebugAI/
├── .github/workflows/
├── backend/
│   ├── src/
│   ├── package.json
│   └── wrangler.jsonc
└── frontend/
    ├── css/
    └── index.html

Run Locally

Backend

cd backend
npx wrangler dev

Frontend

Open "frontend/index.html" or serve the "frontend" directory with any static server.

Status

🚧 Actively developed and working end-to-end.

Author

Nirmal

"Portfolio" (https://nirmal-ai9.github.io/portfolio/)
