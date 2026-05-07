import { c as createComponent } from './astro-component_DAfRxrQF.mjs';
import 'piccolore';
import { n as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute } from './entrypoint_Z1T7W8pZ.mjs';
import { r as renderScript } from './script_CuBBg5E-.mjs';
import { $ as $$Layout } from './Layout_B6boOblY.mjs';
import { s as supabase } from './supabase_BUjGiT2w.mjs';

const $$Kezeles = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Kezeles;
  const token = Astro2.url.searchParams.get("token");
  const { data: booking } = await supabase.from("bookings").select("*").eq("cancel_token", token).single();
  const formattedDate = booking ? new Date(booking.booking_date).toLocaleString("hu-HU", { month: "long", day: "numeric" }) : "";
  const formattedTime = booking ? new Date(booking.booking_date).toLocaleString("hu-HU", { hour: "2-digit", minute: "2-digit" }) : "";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Időpont lemondása" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen flex flex-col font-sans bg-[#fdf2f8]"> <nav class="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-pink-100 px-12 py-6"> <div class="max-w-7xl mx-auto flex justify-between items-center"> <a href="/" class="text-3xl font-serif font-bold text-slate-900 no-underline">Nails<span class="text-pink-600">by</span>Nelly</a> </div> </nav> <div class="flex-1 flex items-center justify-center p-6"> <div class="max-w-xl w-full bg-white rounded-[4rem] p-16 shadow-2xl shadow-pink-200/30 border border-pink-50 text-center relative overflow-hidden"> ${booking ? renderTemplate`<div id="booking-area"> <input type="hidden" id="token-data"${addAttribute(token, "value")}> <div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-10 text-red-500 shadow-inner"> <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> </div> <h1 class="text-5xl font-serif font-bold text-slate-900 mb-6 tracking-tight">Lemondás</h1> <p class="text-slate-500 mb-12 italic font-medium">Sajnáljuk, ha közbejött valami. Biztosan lemondod?</p> <div class="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 mb-12 shadow-inner"> <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Lefoglalt időpont</p> <p class="text-slate-700 font-bold text-lg mb-2">6721 Szeged, Hullám utca 3.</p> <p class="text-4xl font-bold text-[#db2777] tracking-tight mb-2">${formattedDate} ${formattedTime}</p> <p class="text-slate-400 font-bold">+36 30 433 0624</p> </div> <div class="space-y-4"> <button id="cancel-btn" class="w-full py-6 bg-[#db2777] text-white font-bold rounded-[2rem] hover:bg-pink-700 transition-all shadow-xl shadow-pink-200 active:scale-95">Időpont lemondása</button> <a href="/" class="block py-4 text-slate-400 font-bold hover:text-slate-600 transition-all">Mégsem, megtartom az időpontot</a> </div> </div>` : renderTemplate`<div class="py-20 text-center"><p class="text-slate-400 italic text-xl">A foglalás nem található.</p></div>`} <div id="success-area" class="hidden py-10"> <div class="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-10 text-green-500 shadow-inner text-4xl">✓</div> <h2 class="text-5xl font-serif font-bold text-slate-900 mb-6 tracking-tight">Lemondva 🎀</h2> <a href="/" class="inline-block w-full py-6 bg-slate-900 text-white rounded-[2rem] font-bold shadow-xl">Vissza a főoldalra</a> </div> </div> </div> </div> ` })} ${renderScript($$result, "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/kezeles.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/kezeles.astro", void 0);

const $$file = "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/kezeles.astro";
const $$url = "/kezeles";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Kezeles,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
