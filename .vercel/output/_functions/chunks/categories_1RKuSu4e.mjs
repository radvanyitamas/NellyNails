import { s as supabase } from './supabase_BUjGiT2w.mjs';

const POST = async ({ request }) => {
  try {
    const { name } = await request.json();
    const { data, error } = await supabase.from("price_categories").insert([{
      name,
      display_order: 0
    }]).select();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
const DELETE = async ({ url }) => {
  try {
    const id = url.searchParams.get("id");
    if (!id) return new Response(null, { status: 400 });
    const { error } = await supabase.from("price_categories").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
