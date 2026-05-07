import { s as supabase } from './supabase_BUjGiT2w.mjs';

const POST = async ({ request }) => {
  const { service_name, price_value, category_id, description } = await request.json();
  const { error } = await supabase.from("prices").insert([{
    service_name,
    price_value,
    category_id,
    description
  }]);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
const PATCH = async ({ request }) => {
  const { id, service_name, price_value, description } = await request.json();
  const { error } = await supabase.from("prices").update({ service_name, price_value, description }).eq("id", id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
const DELETE = async ({ url }) => {
  const id = url.searchParams.get("id");
  const { error } = await supabase.from("prices").delete().eq("id", id);
  if (error) return new Response(null, { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  PATCH,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
