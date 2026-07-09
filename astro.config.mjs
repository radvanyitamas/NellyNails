// src/astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from "@astrojs/vercel";
import tailwindVite from "@tailwindcss/vite";
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Az éles domain név megadása elengedhetetlen az oldaltérkép helyes linkjeihez
  site: 'https://nailsbynelly.hu',
  
  // Szerveroldali renderelés (SSR) beállítása a dinamikus időpontfoglaláshoz
  output: 'server',
  adapter: vercel(),
  
  // Az oldaltérkép integráció finomhangolása
  integrations: [
    sitemap({
      // A 'forceAndWrite' kényszeríti az Astrót, hogy SSR (szerver) módban is 
      // fizikailag legenerálja és kiírja a sitemap fájlokat a build végén
      forceAndWrite: true
    })
  ],
  
  security: {
    checkOrigin: false
  },
  
  vite: {
    plugins: [tailwindVite()]
  }
});