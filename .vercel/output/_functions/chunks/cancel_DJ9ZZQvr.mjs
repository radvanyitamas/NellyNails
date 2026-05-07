import { s as supabase } from './supabase_BUjGiT2w.mjs';

const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const token = body.token;
    console.log("[Cancel API] Token érkezett:", token);
    if (!token) {
      return new Response(JSON.stringify({ error: "Nincs azonosító!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { error, count } = await supabase.from("bookings").delete({ count: "exact" }).eq("cancel_token", token);
    if (error) {
      console.error("DB hiba:", error.message);
      return new Response(JSON.stringify({ error: "Adatbázis hiba" }), { status: 500 });
    }
    if (count === 0) {
      return new Response(JSON.stringify({ error: "A foglalás már nem létezik." }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Kritikus hiba:", err);
    return new Response(JSON.stringify({ error: "Szerverhiba" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
