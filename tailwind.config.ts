import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0C1A13",
          900: "#14231C",
          800: "#1B3328",
          700: "#22463A",
          600: "#1F7A4D",
          500: "#2A9461",
          400: "#4FB582",
          100: "#DCEFE4",
          50: "#EEF6F1",
        },
        canvas: "#F3F6F2",
        vest: {
          600: "#D9A404",
          500: "#F2B705",
          400: "#FFCB2E",
          100: "#FFF3C4",
        },
        moss: "#5B6B63",
        ember: {
          600: "#C2410C",
          100: "#FDE7DC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        lift: "0 1px 0 rgba(20,35,28,.04), 0 12px 32px -12px rgba(20,35,28,.28)",
        ring: "0 0 0 1px rgba(20,35,28,.08)",
      },
      backgroundImage: {
        hazard:
          "repeating-linear-gradient(-45deg, #F2B705 0 14px, #14231C 14px 28px)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(.9)", opacity: ".7" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "pop-in": {
          "0%": { transform: "translateY(8px) scale(.85)", opacity: "0" },
          "100%": { transform: "none", opacity: "1" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(.2,.6,.3,1) infinite",
        "pop-in": "pop-in .45s cubic-bezier(.2,.8,.3,1.2) both",
      },
    },
  },
  plugins: [],
};

export default config;
