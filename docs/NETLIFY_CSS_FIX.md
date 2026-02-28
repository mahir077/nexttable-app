# Netlify: CSS / Assets না লোড হলে

ড্যাশবোর্ডে CSS বা অ্যাসেট লোড না হলে নিচের স্টেপগুলো চেষ্টা করুন।

## ১. ক্যাশ ক্লিয়ার করে রিডিপ্লয়

1. [Netlify Dashboard](https://app.netlify.com) → আপনার সাইট (nexttable)
2. **Deploys** ট্যাব
3. **Trigger deploy** → **Clear cache and deploy site**

পুরনো ক্যাশ মেইন্টেইন করলে অনেক সময় CSS/স্ট্যাটিক ফাইল ভুল পাথ থেকে serve হয়; ক্লিয়ার করে নতুন বিল্ড নিলে ঠিক হতে পারে।

## ২. বিল্ড সেটিংস চেক করুন

**Site configuration** → **Build & deploy** → **Build settings**:

- **Build command:** `npm run build` (অথবা খালি রাখুন, Netlify Next.js অটো-ডিটেক্ট করবে)
- **Publish directory:** খালি রাখুন (প্লাগইন নিজে সেট করবে; manually `.next` দিলে অনেক সময় CSS ভাঙে)
- **Base directory:** খালি (যদি প্রজেক্ট রুটেই থাকে)

সেভ করে আবার **Clear cache and deploy site** চালান।

## ৩. ব্রাউজার থেকে কোন রিকোয়েস্ট 404 যাচ্ছে দেখুন

1. সাইট ওপেন করুন (যেমন `https://nexttable.netlify.app/dashboard`)
2. **F12** → **Network** ট্যাব
3. পেজ রিফ্রেশ করুন
4. লাল (404/ফেইল) রিকোয়েস্টগুলো দেখুন

সাধারণত এরকম পাথ 404 হয়:

- `/_next/static/chunks/...`
- `/_next/static/css/...`

এই URL গুলো নোট করে Netlify সাপোর্ট বা ফোরামে দিলে সঠিক সমাধান পেতে সুবিধা হয়।

## ৪. বর্তমান কনফিগ

- `netlify.toml`: `publish` সেট করা নেই (প্লাগইন কন্ট্রোল করে)
- `next.config.ts`: `output: 'standalone'` নেই (প্লাগইনের সাথে কনফ্লিক্ট করে)
- বিল্ড: `npm run build` (Next.js 16 + Turbopack)

এগুলো পরিবর্তন না করাই ভালো, শুধু উপরের স্টেপগুলো চেষ্টা করুন।
