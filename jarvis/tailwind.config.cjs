/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep space background scale
        abyss: {
          950: "#04060d",
          900: "#070b16",
          850: "#0a0f1e",
          800: "#0d1425",
          700: "#131c33",
          600: "#1b2745",
        },
        // Neon blue accent scale
        neon: {
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        // Reserved status palette (validated for dark surfaces) — never used as series colors
        status: {
          good: "#0ca30c",
          warning: "#fab219",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
        ink: {
          primary: "#f4f7fb",
          secondary: "#aab6cb",
          muted: "#66738c",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(56, 189, 248, 0.18)",
        "glow-sm": "0 0 12px rgba(56, 189, 248, 0.25)",
        card: "0 8px 32px rgba(2, 6, 16, 0.55)",
      },
      backdropBlur: {
        glass: "18px",
      },
      animation: {
        "fade-in": "fadeIn 240ms ease-out both",
        "slide-up": "slideUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 14s linear infinite",
        "orb-breathe": "orbBreathe 2.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        orbBreathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
