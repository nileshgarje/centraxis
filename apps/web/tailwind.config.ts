import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import centraxisTailwindConfig from "../../packages/ui/tailwind.config";

const config: Config = {
  ...centraxisTailwindConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [tailwindcssAnimate],
};

export default config;
