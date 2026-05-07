import { s as supabase } from './supabase_BUjGiT2w.mjs';

const PATCH = async ({ request }) => {
  const { pw, contact, hours } = await request.json();
  if (pw !== process.env.ADMIN_PASSWORD) {
    return new Response(null, { status: 401 });
  }
  await supabase.from("site_settings").update({ value: contact }).eq("key", "contact");
  await supabase.from("site_settings").update({ value: hours }).eq("key", "hours");
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  PATCH
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
