import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
      colors: {
        primary: {
          50:  "#eaf8ff",
          100: "#d0f0ff",
          200: "#a8e1ff",
          300: "#6dcfff",
          400: "#33bff8",
          500: "#00baf2",
          600: "#009fd4",
          700: "#0080aa",
          800: "#005f80",
          900: "#002970",
          950: "#001a4d",
        },
        accent: {
          50:  "#eef1f8",
          100: "#d5dcea",
          200: "#a8b5d2",
          300: "#7b8fbb",
          400: "#4e68a3",
          500: "#1d3f8a",
          600: "#163375",
          700: "#002970",
          800: "#001f56",
          900: "#001540",
        },
        canvas: "#f4f7fb",
        ink: {
          950: "#0a0f1a",
          900: "#111827",
          800: "#1f2937",
          700: "#374151",
          600: "#4b5563",
          500: "#6b7280",
          400: "#9ca3af",
          300: "#d1d5db",
          200: "#e5e7eb",
          100: "#f3f4f6",
        },
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        card: "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        lift: "0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
        glow: "0 0 24px rgba(0,186,242,0.15)",
        "inner-soft": "inset 0 2px 4px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontSize: {
        base: ["15px", "1.6"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "shimmer": "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
