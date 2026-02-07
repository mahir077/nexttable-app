import type { Config } from "tailwindcss";

/**
 * NextTable POS - UI/UX Design System (Bento-Box Premium)
 * See docs/DESIGN_SYSTEM.md for full specification.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          500: '#10b981', // Emerald - Success, CTAs, Active
          600: '#059669', // Hover, emphasis
        },
        dark: {
          900: '#0f172a', // Slate - Main text, "Next" in logo
          950: '#020617', // Sidebar, deep contrast
        },
        // Status (table states): use emerald-500, orange-500, purple-500, rose-500, blue-600
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        ui: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        brand: ['var(--font-outfit)', 'sans-serif'],
      },
      borderRadius: {
        'bento': '2rem',     // 32px - Cards, large buttons
        'bento-lg': '2.5rem', // 40px - Modals, hero elements
      },
      boxShadow: {
        'bento': '0 10px 40px rgba(0,0,0,0.1)',
        'bento-lg': '0 20px 60px rgba(0,0,0,0.15)',
        'bar-up': '0 -4px 16px rgba(0,0,0,0.1)', // Bottom action bar
      },
      minHeight: {
        'touch': '44px', // Apple HIG min tap target
        'touch-lg': '48px',
      },
    },
  },
  plugins: [],
};
export default config;
