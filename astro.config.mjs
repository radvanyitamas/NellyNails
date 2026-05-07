import { defineConfig } from 'astro/config';
import vercel from "@astrojs/vercel";
import tailwindVite from "@tailwindcss/vite";

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  security: {
    checkOrigin: false
  },
  vite: {
    plugins: [tailwindVite()]
  }
});