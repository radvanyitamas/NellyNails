import { c as createComponent } from './astro-component_DAfRxrQF.mjs';
import 'piccolore';
import { n as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from './entrypoint_Z1T7W8pZ.mjs';
import { $ as $$Layout } from './Layout_B6boOblY.mjs';
import { $ as $$Navigation } from './Navigation_CJ1-8bJp.mjs';
import { s as supabase } from './supabase_BUjGiT2w.mjs';

const $$Koszonjuk = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Koszonjuk;
  const dateParam = Astro2.url.searchParams.get("date");
  const nameParam = Astro2.url.searchParams.get("name") || "Vendég";
  const { data: settings } = await supabase.from("site_settings").select("*");
  const contact = settings?.find((s) => s.key === "contact")?.value || {
    phone: "+36 30 433 0624",
    zip: "6721",
    city: "Szeged",
    street: "Hullám utca",
    houseNumber: "3."
  };
  let googleCalendarUrl = "";
  let formattedDateDisplay = "";
  if (dateParam) {
    const startDate = new Date(dateParam);
    const rawDate = startDate.toLocaleString("hu-HU", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    formattedDateDisplay = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1e3);
    const formatForGoogle = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `🎀 Nails by Nelly - Időpont (${nameParam})`,
      dates: `${formatForGoogle(startDate)}/${formatForGoogle(endDate)}`,
      details: `Szia! Várlak szeretettel!

Cím: ${contact.zip} ${contact.city}, ${contact.street} ${contact.houseNumber}
Telefon: ${contact.phone}`,
      location: `${contact.zip} ${contact.city}, ${contact.street} ${contact.houseNumber}`
    });
    googleCalendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Sikeres megerősítés | Nails by Nelly", "data-astro-cid-p542ffuz": true }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Navigation", $$Navigation, { "data-astro-cid-p542ffuz": true })} ${maybeRenderHead()}<main class="min-h-screen bg-pink-50/30 flex items-center justify-center px-4 relative overflow-hidden pt-20" data-astro-cid-p542ffuz> <div class="absolute top-0 left-0 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" data-astro-cid-p542ffuz></div> <div class="absolute bottom-0 right-0 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" data-astro-cid-p542ffuz></div> <div class="max-w-lg w-full text-center p-10 md:p-16 bg-white rounded-[4rem] shadow-2xl border border-pink-100 relative z-10 animate-in" data-astro-cid-p542ffuz> <div class="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-10 ring-8 ring-green-50/50" data-astro-cid-p542ffuz> <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-astro-cid-p542ffuz> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" data-astro-cid-p542ffuz></path> </svg> </div> <h1 class="text-4xl font-serif font-bold text-slate-900 mb-6 tracking-tight" data-astro-cid-p542ffuz>Minden kész! 🎀</h1> <div class="space-y-6 mb-12" data-astro-cid-p542ffuz> <p class="text-slate-600 text-lg leading-relaxed" data-astro-cid-p542ffuz>
Az időpontodat sikeresen megerősítetted. <br data-astro-cid-p542ffuz> <span class="font-bold text-slate-800 italic" data-astro-cid-p542ffuz>Várlak szeretettel!</span> </p> <div class="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-3 shadow-sm" data-astro-cid-p542ffuz> <p class="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]" data-astro-cid-p542ffuz>Emlékeztető</p> <p class="text-slate-800 font-medium" data-astro-cid-p542ffuz> ${contact.zip} ${contact.city}, ${contact.street} ${contact.houseNumber} </p> <p class="text-2xl font-serif font-bold text-pink-600" data-astro-cid-p542ffuz> ${formattedDateDisplay} </p> <p class="text-sm font-bold text-slate-400" data-astro-cid-p542ffuz> ${contact.phone} </p> </div> </div> <div class="grid gap-4" data-astro-cid-p542ffuz> ${googleCalendarUrl && renderTemplate`<a${addAttribute(googleCalendarUrl, "href")} target="_blank" class="group block w-full py-5 bg-pink-600 text-white font-bold rounded-2xl hover:bg-pink-700 transition-all shadow-xl hover:shadow-pink-200 active:scale-95 flex items-center justify-center gap-3" data-astro-cid-p542ffuz> <svg class="w-6 h-6 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" data-astro-cid-p542ffuz> <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" data-astro-cid-p542ffuz></path> </svg>
Mentés a naptáramba
</a>`} <a href="/" class="block w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm" data-astro-cid-p542ffuz>
Vissza a kezdőlapra
</a> </div> <p class="text-[10px] text-slate-300 uppercase tracking-[0.3em] font-bold mt-12" data-astro-cid-p542ffuz>Nails by Nelly • 2026</p> </div> </main> ` })}`;
}, "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/koszonjuk.astro", void 0);

const $$file = "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/koszonjuk.astro";
const $$url = "/koszonjuk";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Koszonjuk,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
