import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TrustQ brand palette — adjust when design system is finalized
        brand: {
          50:  "#f0f4ff",
          100: "#dce6ff",
          500: "#3b5bdb",
          600: "#2f4ac7",
          700: "#2340b0",
          900: "#1a2f82",
        },
      },
    },
  },
  plugins: [],
};

export default config;
