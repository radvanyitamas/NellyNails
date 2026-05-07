import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel"; // Ellenőrizd, hogy nincs itt /serverless vagy más!

export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // Maradjon szerver mód az API-k miatt
  adapter: vercel({
    webAnalytics: { enabled: true } // Ez segít a Vercel-nek felismerni a konfigurációt
  })
});