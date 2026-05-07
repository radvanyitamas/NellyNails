import { s as supabase } from './supabase_BUjGiT2w.mjs';

const GET = async ({ url, redirect }) => {
  const id = url.searchParams.get("id");
  if (!id) return redirect("/?error=invalid");
  const { data: booking } = await supabase.from("bookings").select("booking_date, name").eq("id", id).single();
  if (!booking) return redirect("/?error=not_found");
  await supabase.from("bookings").update({ status: "confirmed" }).eq("id", id);
  const searchParams = new URLSearchParams({
    date: booking.booking_date,
    name: booking.name
  });
  return redirect(`/koszonjuk?${searchParams.toString()}`);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
