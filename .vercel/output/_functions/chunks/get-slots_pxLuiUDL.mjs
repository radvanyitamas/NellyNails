import { s as supabase } from './supabase_BUjGiT2w.mjs';

const GET = async () => {
  const { data } = await supabase.from("bookings").select("booking_date").or("status.eq.confirmed,status.eq.pending");
  return new Response(JSON.stringify(data?.map((b) => b.booking_date) || []), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
