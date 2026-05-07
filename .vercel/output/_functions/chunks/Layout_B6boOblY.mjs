import { c as createComponent } from './astro-component_DAfRxrQF.mjs';
import 'piccolore';
import { h as addAttribute, p as renderHead, q as renderSlot, r as renderTemplate } from './entrypoint_Z1T7W8pZ.mjs';
import 'clsx';

const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en" data-astro-cid-sckkx6r4> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>Radványi Nelly Nails</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@200..800&display=swap" rel="stylesheet">${renderHead()}</head> <body id="top" class="bg-white" data-astro-cid-sckkx6r4> ${renderSlot($$result, $$slots["default"])}</body></html>`;
}, "/Users/radvanyitamas/Desktop/Projects/NellyNails/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
