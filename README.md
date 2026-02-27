# NextTable App

Restaurant POS & table management (multi-tenant, Supabase).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Root redirects to `/dashboard` (if logged in) or `/login`.

## Env

Create `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deploy on Netlify

1. Push the repo to GitHub/GitLab/Bitbucket and connect the repo in [Netlify](https://app.netlify.com).
2. Build command: `npm run build` (or leave default; Netlify detects Next.js).
3. **Environment variables** (Site settings → Environment variables) – all required for production:
   - `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key (needed for `/api/verify-user`, `/api/verify-admin`, admin APIs; never expose in client)
   - `NEXT_PUBLIC_SITE_URL` – production URL, e.g. `https://nexttable.netlify.app` (optional; used for redirects/emails)
4. **Supabase Dashboard** (Authentication → URL Configuration):
   - **Site URL:** `https://nexttable.netlify.app` (your production domain)
   - **Redirect URLs:** add `https://nexttable.netlify.app/**`, `https://nexttable.netlify.app/login`, `https://nexttable.netlify.app/admin/login`
   Without this, login and session cookies will not work on the deployed site.
5. Deploy. After deploy, **log in again on the production URL** – localhost sessions do not carry over to Netlify.

## Scripts

- `npm run dev` – dev server
- `npm run build` – production build
- `npm run start` – run production build locally
- `npm run lint` – ESLint
