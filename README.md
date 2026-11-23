# Master

One private page for all your apps, with one big red **Pause everything** button.

For each app it shows:
- **Site**: is it answering, and how fast
- **Deploy**: the latest deploy on Vercel or Netlify (or GitHub Pages / GitHub release)
- **Code**: the last commit on GitHub
- **Checks**: the last GitHub Actions run
- **On its own**: what runs by itself (cron, scheduled workflows), and whether it's on

It also shows Claude spend for the month (optional), and lists Vercel/Netlify projects that aren't in your list.

## The pause switch

- **Vercel apps**: the project is paused through Vercel's API. Visitors get "paused" (503) and nothing runs: no functions, no AI calls, no emails, no cron.
- **Scheduled GitHub workflows** (Trend Videos' 3× a day video): turned off, then back on when you resume.
- **Netlify**: has no pause switch in its API. Netlify sites show their status but keep running.
- **Pause everything** covers the apps in the "My apps" group. Websites (some are for clients) and this dashboard are never in it. Each card also has its own Pause / Resume button.

## Set up on Vercel (once)

1. Vercel → **Add New → Project** → import `Anis1988/MasterApp` → **Deploy**. Settings come from `vercel.json` (Vite, output `build`).
2. **Settings → Environment Variables**:
   - `APP_ACCESS_TOKEN` (required): a long password you make up. You type it once on each device.
   - `GITHUB_TOKEN`: [fine-grained token](https://github.com/settings/personal-access-tokens/new), *All repositories*, permissions **Actions: Read and write**, **Contents: Read-only**.
   - `VERCEL_TOKEN`: [Vercel → Account Settings → Tokens](https://vercel.com/account/settings/tokens). Add `VERCEL_TEAM_ID` only if the projects are in a team.
   - `NETLIFY_TOKEN` (optional): [Netlify personal access token](https://app.netlify.com/user/applications#personal-access-tokens).
   - `ANTHROPIC_ADMIN_KEY` (optional): Claude Console → Settings → Admin keys (organizations only).
3. **Deployments → ⋯ → Redeploy** so the keys are used.

## Add an app

Add a line to `server/catalog.ts` with the GitHub repo name. Vercel and Netlify projects are matched by their linked repo, so the address, deploy status and pause switch are found automatically.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev
```

`npm run dev` serves `api/*.ts` too (see `vite.config.ts`).

## Kill switch (every app, any host)

Each of your apps asks Master before AI calls and background jobs: `GET <master>/api/flags?app=<catalog id>` →
`{ ai, work, paused }`. `ai: true` = don't call AI; `work: true` = don't run cron jobs, scheduled functions or send
emails. Apps keep the answer 30 s and carry on if Master can't be reached. The flags live in Upstash Redis
(`KV_REST_API_URL` / `KV_REST_API_TOKEN`, Vercel → Storage). Pause / Pause everything set both flags for the app;
"AI off everywhere" sets `ai` for all. The helper each app uses is in `connect/master-switch.ts`.
