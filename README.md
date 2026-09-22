Why I Built DebugAI
Debugging used to eat up way too much of my dev time. Staring at stack traces for hours just to find a missing bracket or a subtle logic bug was exhausting. I wanted a tool that felt fast, smart, and actually fun to use—so I built DebugAI. It analyzes your code in seconds, points out where things went sideways, and gives you clear, actionable fixes without all the fluff.
A Frontend with Personality
I didn't want this to look like another generic, boring admin dashboard. I went with a clean, retro-inspired UI complete with dynamic code windows, CRT-style token displays, and subtle glitch effects to give it character.
Underneath the aesthetics, I kept it super lightweight—just clean modular HTML, CSS, and vanilla JavaScript (effects.js and interactive.js). No massive frontend frameworks dragging down load times or bloating the project.
Speed First: The Tech Stack
To keep response times lightning fast, I put the backend on Cloudflare Workers using Node.js. Running on the edge means your code analysis happens ridiculously fast, no matter where you are.
Every push to the repo triggers automated deployments via GitHub Actions (deploy.yml), keeping the infrastructure effortless and always up to date.
Want to Run It Yourself?
Getting DebugAI running on your local machine takes less than two minutes:
 * Backend: Jump into the backend/ folder, install the dependencies with npm install, and kick off the local edge worker using npx wrangler dev.
 * Frontend: Since the frontend is purely static, hop into frontend/ and spin up any simple server, like npx serve . or python -m http.server.
Let's Build Together
DebugAI is an evolving project, and I'm constantly tweaking things to make it better. Whether you want to add new visual effects, optimize the edge logic, or fix an edge-case bug, I'd love your help—feel free to jump into the code and open a pull request!
