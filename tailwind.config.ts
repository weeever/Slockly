import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./public/*.svg"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        }
      },
      boxShadow: {
        'neon': "0 0 80px rgba(139,92,246,.25)",
        'inner-card': "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,.6)"
      },
      backgroundImage: {
        'radial-glow': "radial-gradient(1200px 600px at 70% 10%, rgba(139,92,246,.25), rgba(0,0,0,0))",
        'radial-glow-2': "radial-gradient(800px 400px at 20% 30%, rgba(147,51,234,.25), rgba(0,0,0,0))"
      }
    },
  },
  plugins: [],
};
export default config;
