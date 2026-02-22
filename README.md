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
3. Add environment variables in **Site settings → Environment variables**:  
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Netlify uses the OpenNext adapter for Next.js automatically.

## Scripts

- `npm run dev` – dev server
- `npm run build` – production build
- `npm run start` – run production build locally
- `npm run lint` – ESLint
