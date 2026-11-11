import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { deep: "#0B0F1D", surface: "#171B33", elevated: "#1D2340", border: "#2A3150" },
        text: { primary: "#F8F8FC", secondary: "#B7BDD0", muted: "#7A8199" },
        brand: { DEFAULT: "#7559E8", bright: "#8B70FF", subtle: "#A78BFA" },
        accent: { teal: "#22C58B", amber: "#F5A623", rose: "#F05D70", blue: "#5B9EFF" },
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
