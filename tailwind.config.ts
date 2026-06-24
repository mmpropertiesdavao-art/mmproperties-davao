import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — see docs/DESIGN_SYSTEM.md for usage rules.
        navy: {
          50: "#EAEEF5",
          100: "#CBD5E5",
          200: "#9FB1CC",
          300: "#6E84A8",
          400: "#445E84",
          500: "#2A436A",
          600: "#1C3158",
          700: "#142447",
          800: "#0D1A35",
          900: "#081224", // primary brand navy — header, footer, primary text on light bg
        },
        gold: {
          50: "#FBF6E9",
          100: "#F5E8C2",
          200: "#EDD896",
          300: "#E3C566",
          400: "#D6B144",
          500: "#C6A136", // primary accent gold — CTAs, highlights, active states
          600: "#A8852A",
          700: "#856722",
          800: "#5F4A18",
          900: "#3D300F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
