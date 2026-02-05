import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#2b2b2b",
        "paper-white": "#fdfdfd",
        "muted-foreground": "var(--muted-foreground)",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "paper-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        "paper": "0 4px 20px rgba(0, 0, 0, 0.03)",
        "paper-hover": "0 12px 24px -6px rgba(0, 0, 0, 0.08), 0 8px 16px -8px rgba(0, 0, 0, 0.1)",
        "paper-stack": "0 1px 1px rgba(0,0,0,0.05), 0 2px 2px rgba(0,0,0,0.05), 0 4px 4px rgba(0,0,0,0.05), 0 8px 8px rgba(0,0,0,0.05)",
        "deep-stack": "0 20px 50px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
