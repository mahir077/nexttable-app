# NextTable POS - UI/UX DESIGN SYSTEM

**Version:** 2.1 CORE+  
**Style:** Bento-Box Premium  
**Scope:** Module 15 (Settings) + Foundation for entire system

---

## 🎯 DESIGN PHILOSOPHY

- **Aesthetic:** Ultra-modern, high-contrast, premium "Bento-box" style
- **Goal:** Professional restaurant software with friendly, tactile feel
- **Target:** Touch-first interface for staff efficiency

---

## 🔤 TYPOGRAPHY

| Role | Font | Usage | Weights |
|------|------|--------|---------|
| **Brand** | Outfit | Brand name, large numbers, section headings | 900 (Black) |
| **UI** | Inter | All interface text, buttons, labels, body | 500, 600, 700, 800 |

- **Outfit:** "Next" + "Table" logo, "৳12,450", "TABLE 1" — [Google Fonts](https://fonts.google.com/specimen/Outfit)
- **Inter:** Navigation, table labels, form fields — [Google Fonts](https://fonts.google.com/specimen/Inter)

**Logo example:** "NextTable" = Outfit Black 900 | "RESTAURANT CONTROL HUB" = Inter Medium 500

---

## 🎨 COLOR PALETTE

### Primary
- **Emerald-500:** `#10b981` — Success, CTAs, Active states
- **Emerald-600:** `#059669` — Hover, emphasis
- **Usage:** "Table" in logo, primary buttons, success indicators

### Dark Accents
- **Slate-900:** `#0f172a` — Main text, "Next" in logo
- **Slate-950:** `#020617` — Sidebar background
- **Slate-800:** `#1e293b` — Secondary dark elements

### Light/Neutral
- **Slate-50:** `#f8fafc` — Main background
- **Slate-100:** `#f1f5f9` — Card backgrounds
- **Slate-200:** `#e2e8f0` — Borders, dividers
- **White:** `#ffffff` — Cards, modals

### Status Colors (Table States)
| State | Color | Hex |
|-------|--------|-----|
| AVAILABLE | Emerald-500 | #10b981 |
| RESERVED | Orange-500 | #f59e0b |
| KOT SENT | Purple-500 | #a855f7 |
| OCCUPIED | Rose-500 | #f43f5e |
| BILLING | Blue-600 | #2563eb |

Use `-50`/`-100` variants for card backgrounds.

### Accent
- **Cyan-500:** BILLING HUB, info
- **Purple-600:** MERGE TOKEN, special actions
- **Rose-600:** Destructive actions

---

## 🏗️ VISUAL LANGUAGE

### Corner Radius (Bento)
- Cards: `rounded-[2rem]` (32px)
- Large buttons: `rounded-[2rem]`
- Medium buttons: `rounded-[1.5rem]`
- Small: `rounded-xl`
- Table cards: `rounded-[1.5rem]` + status-colored border
- Modals: `rounded-[2.5rem]` (40px)

### Shadows
- Cards: `shadow-lg`
- Hover: `shadow-xl`
- Modals: `shadow-2xl`
- Primary buttons: `shadow-md` → `shadow-lg` on hover
- Bottom bar: `shadow-[0_-4px_16px_rgba(0,0,0,0.1)]` (shadow bar-up)

### Borders
- Cards: `border border-slate-200`
- Table cards: `border-2 border-[status-color]`
- Input focus: `border-2 border-emerald-500`

### Glassmorphism
- Sticky headers: `bg-white/80 backdrop-blur-md`
- Floating bars: `bg-slate-900/95 backdrop-blur-lg`
- Modal overlay: `bg-slate-900/40 backdrop-blur-sm`

---

## 📐 SPACING & LAYOUT

- **Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Card grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **Table grid:** `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`
- **Breakpoints:** sm 640px, md 768px, lg 1024px, xl 1280px

**Spacing:** space-y-2 (tight) → space-y-4 → space-y-6 → space-y-8 → space-y-12  
**Card padding:** p-8 (large), p-6 (medium)  
**Buttons:** px-8 py-4 (large), px-6 py-3 (medium)  
**Sidebar items:** px-6 py-3

---

## 👆 TOUCH UX

- **Min tap target:** 44×44px (Apple HIG)
- **Recommended:** 48×48px — use `min-h-touch` (44px) or `h-12` (48px)
- **Bottom actions:** `fixed bottom-0`, `pb-safe`, shadow up
- **Badges:** Outfit 900, `min-w-6 h-6 text-sm`, `bg-rose-500 text-white`

---

## 🎨 BRANDING RULES

**Logo:** "Next" (Slate-900) + "Table" (Emerald-500), Outfit Black 900, `text-3xl`/`text-4xl`  
**Subtitle:** Inter, Slate-400, `text-xs` (e.g. "CLOUD POS SYSTEM")

**Where logo appears:** Dashboard header, Sidebar, Login, Invoice/KOT (if branding on).

**White-label:** When `show_nexttable_branding = false` — use `display_name`, `logo_url`, `primary_color`, `secondary_color` from settings.

---

## 📱 RESPONSIVE

- **Mobile (<640px):** Single column, full-width cards, min 48px touch, bottom-sticky bars, collapsible sidebar
- **Tablet (640–1024px):** 2-col table grid, toggle sidebar, p-6 cards
- **Desktop (>1024px):** 3–4 col table grid, persistent sidebar, hover states

---

## ✅ CHECKLIST

- [x] Typography (Outfit + Inter)
- [x] Color palette (Emerald + Slate + Status)
- [x] Spacing scale
- [x] Bento radius & shadows
- [x] Button/Card/Table/Nav styles
- [x] Touch UX (44px min)
- [x] Responsive breakpoints
- [x] White-label support (settings)

---

## 🔧 TAILWIND REFERENCE

Use `font-brand` for Outfit, `font-sans`/`font-ui` for Inter.  
Colors: `primary-500`, `primary-600`, `dark-900`, `dark-950`.  
Radius: `rounded-bento`, `rounded-bento-lg`.  
Shadows: `shadow-bento`, `shadow-bento-lg`, `shadow-bar-up`.  
Min touch: `min-h-touch` (44px), `min-h-touch-lg` (48px).

---

*End of Design System — NextTable POS v2.1 CORE+*
