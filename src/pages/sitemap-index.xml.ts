// src/pages/sitemap-index.xml.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const domain = "https://nailsbynelly.hu";
  
  // Összegyűjtjük Nelly oldalának fix, publikus aloldalait
  const pages = [
    "",              // Főoldal
    "/admin",        // Bár ez az admin, a kereső látni fogja (opcionális)
    "/impresszum",
    "/adatvedelem",
  ];

  // Felépítjük a hivatalos XML struktúrát
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
  <url>
    <loc>${domain}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === "" ? "1.0" : "0.7"}</priority>
  </url>`).join('')}
</urlset>`.trim();

  // Visszaküldjük a választ a Google-nek megfelelő XML fejléc azonosítóval
  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400' // 1 napig gyorsítótárazhatja a Google
    }
  });
};