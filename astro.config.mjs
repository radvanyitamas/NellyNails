import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";

export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: vercel({
    // Ez a sor kényszeríti a modernebb struktúrát
    webAnalytics: { enabled: true }
  }),
  // Kényszerítsük a build kimenetet a gyökérbe
  build: {
    server: './dist/server/entry.mjs'
  }
});