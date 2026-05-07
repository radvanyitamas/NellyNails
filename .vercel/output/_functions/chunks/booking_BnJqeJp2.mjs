import { Resend } from 'resend';
import { s as supabase } from './supabase_BUjGiT2w.mjs';
import { g as getEmailHtml } from './emailTemplate_CI51EJym.mjs';

const resend = new Resend("re_MwWWwd1m_7iSHE6SKZHqwxLgW6c3ob1ah");
const POST = async ({ request }) => {
  try {
    const data = await request.formData();
    const name = data.get("name")?.toString();
    const email = data.get("email")?.toString();
    const phone = data.get("phone")?.toString();
    const dateStr = data.get("date")?.toString();
    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { status: 400 });
    }
    const requestedDate = new Date(dateStr);
    const threeHoursInMs = 3 * 60 * 60 * 1e3;
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs + 1e3).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs - 1e3).toISOString();
    const { data: conflict } = await supabase.from("bookings").select("id").or("status.eq.confirmed,status.eq.pending").gt("booking_date", minTime).lt("booking_date", maxTime).maybeSingle();
    if (conflict) {
      return new Response(JSON.stringify({ error: "Ez az időpont ütközik egy másik foglalással (3 órás szabály)!" }), { status: 400 });
    }
    const { data: booking, error: dbError } = await supabase.from("bookings").insert([{
      name,
      email,
      phone,
      booking_date: requestedDate.toISOString(),
      status: "pending"
    }]).select().single();
    if (dbError) {
      console.error("Supabase adatbázis hiba:", dbError);
      return new Response(JSON.stringify({ error: "Adatbázis hiba történt a mentés során." }), { status: 500 });
    }
    const origin = new URL(request.url).origin;
    const confirmLink = `${origin}/api/confirm?id=${booking.id}`;
    const manageLink = `${origin}/kezeles?token=${booking.cancel_token}`;
    const formattedDate = requestedDate.toLocaleString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    try {
      console.log(`[E-mail Debug] Küldés indítása ide: ${email}`);
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Nails by Nelly <onboarding@resend.dev>",
        to: [email],
        subject: "🎀 Időpont megerősítése: Nails by Nelly",
        html: getEmailHtml(name, formattedDate, confirmLink, manageLink)
      });
      if (emailError) {
        console.error("[E-mail Debug] Resend API hiba:", emailError);
      } else {
        console.log("[E-mail Debug] Sikeres küldés! Resend ID:", emailData?.id);
      }
    } catch (err) {
      console.error("[E-mail Debug] Kritikus hiba az email folyamatban:", err);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Általános szerverhiba:", error);
    return new Response(JSON.stringify({ error: "Szerverhiba történt." }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
