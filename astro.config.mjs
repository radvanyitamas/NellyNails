import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server', // Ez kell a dinamikus naptárhoz és az API-hoz
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
  },
});

// HpwcdRs@N6y2+s6