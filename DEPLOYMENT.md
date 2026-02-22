# Netlify Deployment Guide

Deploy NextTable to [Netlify](https://www.netlify.com/) with Next.js and Supabase.

---

## Prerequisites

- Git repo (GitHub, GitLab, or Bitbucket) with the project
- [Netlify account](https://app.netlify.com)
- [Supabase project](https://supabase.com) with URL and keys

---

## 1. Netlify project setup

1. Log in at [app.netlify.com](https://app.netlify.com).
2. **Add new site** → **Import an existing project**.
3. Connect your Git provider and select this repository.
4. Netlify will use the repo’s **netlify.toml**:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Plugin:** `@netlify/plugin-nextjs`
   - **Node version:** 18 (set in `netlify.toml`)

5. Do **not** start the first deploy yet. Set environment variables first (step 2).

---

## 2. Environment variables

In Netlify: **Site settings** → **Environment variables** → **Add a variable** (or **Import from .env**).

Add these (replace with your real values):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for admin) | Supabase service role key (admin create-client, manage clients). Keep secret. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Full site URL (e.g. `https://your-site.netlify.app`). Used for login links in admin flows. Defaults to `http://localhost:3000` if unset. |

- For **production**: add/override variables in **Production** (or **All**).
- You can copy variable names (and optional placeholders) from **.env.example** in the repo.

---

## 3. Deploy

1. Trigger a deploy:
   - **Deploy site** (first time), or  
   - **Trigger deploy** → **Deploy site** (later), or  
   - Push to the connected branch (auto deploy).
2. Wait for the build. The build runs:
   - `npm run build` (Next.js build)
   - `@netlify/plugin-nextjs` (Netlify’s Next.js handling)
3. Open the site URL Netlify assigns (e.g. `https://random-name-123.netlify.app`).

---

## 4. Optional: custom domain and HTTPS

- **Site settings** → **Domain management** → add your domain.
- Netlify provides free HTTPS (Let’s Encrypt).
- After adding a domain, set **NEXT_PUBLIC_SITE_URL** to that URL (e.g. `https://yourdomain.com`) and redeploy so login/admin links use the correct base URL.

---

## 5. Local setup from this repo

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Copy env example and fill in values:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase URL, anon key, and (if using admin) service role key.
3. Run locally:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## 6. Troubleshooting

- **Build fails on Netlify**
  - Check **Deploy log** for the exact error.
  - Confirm **Node version 18** (set in `netlify.toml`).
  - Confirm all **required** env vars are set (no typos).

- **Auth or API errors in production**
  - Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify env.
  - In Supabase Dashboard: **Authentication** → **URL Configuration** → add your Netlify URL to **Redirect URLs** (e.g. `https://your-site.netlify.app/**`).

- **Admin create-client or manage clients fails**
  - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Netlify (and not exposed in client-side code).

---

## Config reference

- **netlify.toml** – build command, publish directory, Node 18, `@netlify/plugin-nextjs`.
- **.env.example** – list of env vars and short descriptions; copy to `.env.local` for local dev.
