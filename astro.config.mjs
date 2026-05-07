import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: 'server', // Ez kell a dinamikus naptárhoz és az API-hoz
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});

// HpwcdRs@N6y2+s6