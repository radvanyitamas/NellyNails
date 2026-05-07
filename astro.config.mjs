import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";

export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: vercel({
    // Ez kényszeríti az Astro-t, hogy a Vercel szabvány szerint építse fel a szervert
    deploymentStrategy: 'serverless' 
  })
});