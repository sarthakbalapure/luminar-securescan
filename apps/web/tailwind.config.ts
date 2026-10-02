import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        signal: "#0F766E",
        ember: "#B42318",
        amber: "#B54708"
      },
      boxShadow: {
        panel: "0 8px 24px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
