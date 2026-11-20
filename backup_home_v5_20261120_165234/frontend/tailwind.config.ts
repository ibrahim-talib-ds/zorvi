import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "var(--bg-deep)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          border: "var(--bg-border)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        brand: { DEFAULT: "#7559E8", bright: "#8B70FF", subtle: "#A78BFA" },
        accent: {
          teal: "#22C58B",
          amber: "#F5A623",
          rose: "#F05D70",
          blue: "#5B9EFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-brand": "0 0 24px rgba(117,89,232,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
