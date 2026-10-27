import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#4F46E5", soft: "#6366F1", tint: "#EEF2FF" }, // indigo
        achrocall: { DEFAULT: "#059669", soft: "#10B981", tint: "#ECFDF5" }, // emerald
      },
      boxShadow: {
        // soft multi-layered card shadows
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 14px -4px rgba(15,23,42,0.07)",
        "card-hover": "0 1px 2px rgba(15,23,42,0.05), 0 10px 28px -8px rgba(15,23,42,0.14)",
        float: "0 2px 4px rgba(15,23,42,0.05), 0 24px 60px -12px rgba(15,23,42,0.28)",
      },
      keyframes: {
        "fresh-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(5,150,105,0.35)" },
          "100%": { boxShadow: "0 0 0 10px rgba(5,150,105,0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        bar: {
          "0%, 100%": { transform: "scaleY(0.25)" },
          "50%": { transform: "scaleY(1)" },
        },
        "slide-left": {
          "0%": { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "slide-right": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "none" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fresh: "slide-in 0.3s ease-out, fresh-ring 1.4s ease-out 3",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-left": "slide-left 0.25s ease-out",
        "slide-right": "slide-right 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        bar: "bar 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
