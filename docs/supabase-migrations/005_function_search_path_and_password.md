# Fix remaining Security Advisor warnings (3)

## 1 & 2: Function Search Path Mutable (`mark_order_served`, `process_payment`)

Supabase SQL Editor এ গিয়ে **New query** নিয়ে নিচের SQL রান করো:

```sql
-- Fix: Function Search Path Mutable (trigger functions may have 1 arg, so 004 skipped them)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname AS fnname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS fnargs
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('mark_order_served', 'process_payment')
  LOOP
    IF r.fnargs = '' THEN
      EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public', r.fnname);
    ELSE
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', r.fnname, r.fnargs);
    END IF;
  END LOOP;
END $$;
```

ওপরেরটা যদি error দেয় (যেমন `proname` না থাকা), তাহলে নিচেরটা চালাও (একেকটা আলাদা করে):

```sql
ALTER FUNCTION public.mark_order_served() SET search_path = public;
ALTER FUNCTION public.process_payment() SET search_path = public;
```

যদি আবার error আসে `function ... does not exist`, তাহলে trigger argument দিয়ে চেষ্টা করো:

```sql
ALTER FUNCTION public.mark_order_served(trigger) SET search_path = public;
ALTER FUNCTION public.process_payment(trigger) SET search_path = public;
```

---

## 3: Leaked Password Protection Disabled (Auth)

এটা **SQL দিয়ে হয় না** – Supabase Dashboard থেকে করতে হয়:

1. **Supabase Dashboard** → তোমার প্রজেক্ট খোলো।
2. বাম থেকে **Authentication** → **Providers**।
3. **Email** ওপর ক্লিক করো।
4. নিচে **Password** সেকশনে যাও।
5. **“Check HaveIBeenPwned on signup”** (বা Leaked password protection) **ON** করো।
6. **Save** দাও।

এর পরে Security Advisor এ ওই ৩টা warning ঠিক হয়ে যাওয়ার কথা। একবার **Rerun linter** দিয়ে চেক করো।
