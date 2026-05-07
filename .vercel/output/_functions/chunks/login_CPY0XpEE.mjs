import { c as createComponent } from './astro-component_DAfRxrQF.mjs';
import 'piccolore';
import { n as renderComponent, r as renderTemplate, m as maybeRenderHead } from './entrypoint_Z1T7W8pZ.mjs';
import { r as renderScript } from './script_CuBBg5E-.mjs';
import { $ as $$Layout } from './Layout_B6boOblY.mjs';
import { $ as $$Navigation } from './Navigation_CJ1-8bJp.mjs';

const $$Login = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Bejelentkezés | Nails by Nelly" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Navigation", $$Navigation, {})} ${maybeRenderHead()}<main class="min-h-screen flex items-center justify-center bg-slate-50 px-4"> <div class="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-pink-100"> <h1 class="text-3xl font-serif font-bold text-center mb-8 text-slate-900">Admin Belépés</h1> <form id="login-form" class="space-y-6"> <div> <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">E-mail cím</label> <input type="email" name="email" required class="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"> </div> <div> <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">Jelszó</label> <input type="password" name="password" required class="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"> </div> <button type="submit" class="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl">
Belépés
</button> </form> <p id="error-msg" class="mt-4 text-center text-red-500 text-sm font-bold hidden"></p> </div> </main> ` })} ${renderScript($$result, "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/login.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/login.astro", void 0);

const $$file = "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
