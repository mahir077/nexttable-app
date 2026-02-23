# Netlify-তে ডেটা ভুল/লোড না – ঠিক করার স্টেপ

লোকালহোস্টে ডেটা ঠিক আসে, Netlify-তে ভুল বা উলটোপালটা ডেটা / লোড না। নিচের জিনিসগুলো একটার পর একটা চেক করো।

---

## ১. Build time এ env (সবচেয়ে কমন কারণ)

Next.js **build** করার সময় `NEXT_PUBLIC_*` ভেরিয়েবল জাভাস্ক্রিপ্টের ভেতর বসিয়ে দেয়। Netlify-তে build যেদিন চলে, সেদিন যদি এই দুটো **নেই** থাকে, তাহলে প্রোডাকশনে ভুল/খালি ডেটা বা হ্যাং হতে পারে।

**কি করবে:**

1. Netlify → তোমার site → **Site configuration** → **Environment variables**
2. নিশ্চিত করো:
   - `NEXT_PUBLIC_SUPABASE_URL` = তোমার Supabase project URL (যেমন `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
3. **Scopes** এ যেন **Build** থাকে (অথবা “All”)। শুধু “Deploy” বা “Runtime” থাকলে build-এর সময় মান পায় না।
4. **Save** দিয়ে তারপর **Trigger deploy** → **Deploy site** (নতুন build চালাও)। পুরনো build ক্যাশে থাকলে সেটা দিয়ে ভুল থাকবে।

---

## ২. Supabase Auth – Redirect URLs

প্রোডাকশন ডোমেইনে লগইন/সেশন ঠিক না থাকলে অন্য org-এর ডেটা বা খালি ডেটা দেখাতে পারে।

**কি করবে:**

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** `https://nexttable.netlify.app` (অথবা তোমার actual Netlify URL) দাও
3. **Redirect URLs** এ যোগ করো:
   - `https://nexttable.netlify.app/**`
   - `https://nexttable.netlify.app`
4. Save করো।

---

## ৩. একই Supabase প্রজেক্ট ব্যবহার হচ্ছে তো?

লোকালে `.env.local` এ যে Supabase URL + anon key আছে, Netlify-এর env-এ **ঠিক সেই একই** URL + anon key আছে কিনা চেক করো। ভিন্ন প্রজেক্ট থাকলে ডেটা আলাদা/ভুল দেখাবে।

---

## ৪. রিডিপ্লয় after env change

Env ভেরিয়েবল যেকোনো পরিবর্তনের পর **অবশ্যই নতুন deploy** (Trigger deploy → Deploy site) দিতে হবে। তাহলে নতুন build চালু হবে এবং সঠিক env নিয়ে bundle বানবে।

---

## ৫. চেকলিস্ট (সংক্ষেপে)

| চেক | কোথায় | কি দেখবে |
|-----|--------|----------|
| Build env | Netlify → Environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` আছে এবং Scopes এ **Build** আছে |
| Redeploy | Netlify → Deploys | env সেভ করার পর নতুন deploy চালিয়েছ |
| Site URL | Supabase → Auth → URL Configuration | Site URL = Netlify URL |
| Redirect URLs | Supabase → Auth → URL Configuration | Netlify URL (এবং `/**`) যোগ আছে |
| Same project | .env.local vs Netlify env | একই Supabase URL + anon key |

---

## ৬. এর পরেও ভুল ডেটা আসলে

ব্রাউজার কনসোলে (F12 → Console) দেখো:

- `[Supabase] Missing NEXT_PUBLIC_...` থাকলে = build সময় env পায়নি → উপরের ধাপ ১ ও ৪ আবার করো।
- কোনো auth/redirect এরর থাকলে → ধাপ ২ চেক করো।

একটা একটা স্টেপ মেনে করলে Netlify-তে ডেটা লোকালের মতোই সঠিক আসার কথা।
