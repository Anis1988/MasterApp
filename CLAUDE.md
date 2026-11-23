# Working on this repo

- Master = a private dashboard for all of Anis1988's apps + one pause switch. Vite + React 18 + TypeScript, plain CSS (`src/index.css`, every colour a CSS variable, light and dark). Deployed on Vercel from `main`.
- Two server functions (Vercel Hobby allows 12): `api/status.ts` (GET, everything on the page, cached 45 s in memory, `?fresh=1` skips the cache) and `api/pause.ts` (POST `{action: "pause"|"resume", all: true}` or `{action, id}`). Logic lives in `server/`. Server imports end in `.js` (Vercel runs `api/` as Node ESM). `npm run dev` serves `api/*.ts` too (`vite.config.ts`).
- Every API call needs `APP_ACCESS_TOKEN` (header `X-Access-Token`), same pattern as the other apps.
- The app list is `server/catalog.ts` (groups: `mine`, `device`, `sites`). Vercel projects and Netlify sites are matched to it by linked GitHub repo (lower case). Unmatched ones show under "Also on Vercel / Netlify".
- Pause = Vercel `POST /v1/projects/{id}/pause` (site answers 503 DEPLOYMENT_PAUSED) + GitHub `PUT …/actions/workflows/{id}/disable` for workflows whose file has `on: schedule` (detected from the file, cached 1 h). Resume = unpause + enable. Netlify has no pause API. "Pause everything" = group `mine` only, never websites (client sites) or this app (`self`).
- Data sources: GitHub GraphQL (one query for all repos: last commit, latest release), GitHub REST (latest Actions run, workflows), Vercel `GET /v10/projects` (deploy state, `paused`, aliases), Netlify `GET /sites` + latest deploy, Anthropic Admin `GET /v1/organizations/cost_report` (amounts in cents, `group_by[]=description`), and a GET of each site for uptime.
- Phone-friendly is required: check a 390px-wide layout for any UI change, in light and dark.
- Keep the Guide (`Guide` in `src/components/Panels.tsx`) up to date with user-visible changes, in plain everyday words.
- Do not add automated tests unless asked.
