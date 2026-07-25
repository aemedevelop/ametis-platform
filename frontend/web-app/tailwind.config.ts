import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d9eeff",
          200: "#bce0ff",
          300: "#8fcaff",
          400: "#56a9ff",
          500: "#2b86f4",
          600: "#1769d6",
          700: "#1455ad",
          800: "#154989",
          900: "#173f73",
          950: "#0c2345"
        },
        cyanAccent: "#00d4c8",
        slateInk: "#0b1220",
        cloud: "#f4f9ff"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 20px 55px -30px rgba(14, 65, 140, 0.65)"
      }
    }
  },
  plugins: []
};

export default config;
