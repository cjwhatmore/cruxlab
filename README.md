# CruxLab | Climbing performance

Mobile-first, installable climbing training journal and coaching prototype. No build tools, external libraries, credentials or server required.

## Publish with GitHub Pages
1. Create a repository named `cruxlab` at https://github.com/new (public for free GitHub Pages).
2. Extract the ZIP and upload **the contents** of the cruxlab folder to the repository root, including `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, and the icon files. Commit to `main`.
3. Open repository **Settings → Pages**. Under Build and deployment choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. Open the published URL shown on that settings page (typically `https://YOUR-USERNAME.github.io/cruxlab/`).
5. iPhone Safari: Share → Add to Home Screen. Android Chrome: menu → Install app / Add to Home screen. After one successful online visit, the app shell can be used offline.

## Local development
Open `index.html` for a quick preview, or serve the folder via Python:

```sh
python -m http.server 8000
```

Visit http://localhost:8000. Service workers need HTTPS or localhost. Data is stored separately for each browser and origin; a local preview and the published website do not share data.

## Features
- Today: check-in driven session recommendations, weekly workload, upcoming sessions.
- Log: create, edit, delete sessions; record grades, sends, attempts, effort, finger load, notes and performance measurements. Drafts auto-save.
- Plan: upcoming seven days, manually scheduled outdoor days, editable suggested sessions and training goal.
- Stats: 28-day climbing grade distribution, top sends, session load and trends for comparable measurement protocols.
- Coach: transparent keyword-based replies informed by recorded data; not an actual LLM yet.
- Settings: JSON backup export, restore and clear local data.

## Data and safety
This prototype stores data in browser localStorage only. No cloud sync, account, remote AI, or analytics tracking. Export backups regularly. Loading the site on a second device starts a separate log. Local browser data is not encrypted by the application. Never put private logs in a public repository. Recovery recommendations are illustrative conservative rules, not medical advice or validated injury predictions. Dates and self-reported finger loads are used as coarse signals, and actual readiness must be reassessed.

## Next development phase
Add Supabase authentication and a per-user database with row-level security; deploy a separate authenticated server-side agent endpoint that calls an LLM with validated tools to propose and confirm structured logs, query metrics and recommend sessions. Keep all API secrets on the server, never in GitHub Pages JavaScript. Add sync and offline conflict handling, structured guided exercises, rest timers, and richer adaptive planning. The static frontend can remain on GitHub Pages.
