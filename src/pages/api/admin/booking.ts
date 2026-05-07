import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { supabase } from '../../../lib/supabase';
import { getEmailHtml } from '../../../lib/emailTemplate';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Adatok kinyerése a formból
    const data = await request.formData();
    const name = data.get('name')?.toString();
    const email = data.get('email')?.toString();
    const phone = data.get('phone')?.toString();
    const dateStr = data.get('date')?.toString();

    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { status: 400 });
    }

    const requestedDate = new Date(dateStr);
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    
    // 2. Precíz ütközésvizsgálat (Oda-vissza 3 óra)
    // Megnézzük, van-e olyan foglalás, ami a kért időpont előtt vagy után 3 órán belül van
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs + 1000).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs - 1000).toISOString();

    const { data: conflict } = await supabase
      .from('bookings')
      .select('id')
      .or('status.eq.confirmed,status.eq.pending')
      .gt('booking_date', minTime)
      .lt('booking_date', maxTime)
      .maybeSingle();

    if (conflict) {
      return new Response(JSON.stringify({ error: "Ez az időpont ütközik egy másik foglalással (3 órás szabály)!" }), { status: 400 });
    }

    // 3. Mentés a Supabase adatbázisba
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        email, 
        phone, 
        booking_date: requestedDate.toISOString(), 
        status: 'pending' 
      }])
      .select()
      .single();

    if (dbError) {
      console.error("Supabase adatbázis hiba:", dbError);
      return new Response(JSON.stringify({ error: "Adatbázis hiba történt a mentés során." }), { status: 500 });
    }

    // 4. Email küldés előkészítése
    const origin = new URL(request.url).origin;
    const confirmLink = `${origin}/api/confirm?id=${booking.id}`;
    const manageLink = `${origin}/kezeles?token=${booking.cancel_token}`;
    const formattedDate = requestedDate.toLocaleString('hu-HU', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // 5. Email küldés hibakereséssel (Izolált try-catch)
    try {
      console.log(`[E-mail Debug] Küldés indítása ide: ${email}`);
      
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Nails by Nelly <onboarding@resend.dev>',
        to: [email!],
        subject: '🎀 Időpont megerősítése: Nails by Nelly',
        html: getEmailHtml(name!, formattedDate, confirmLink, manageLink)
      });

      if (emailError) {
        // Itt fogod látni a pontos hibaüzenetet a VS Code termináljában!
        console.error("[E-mail Debug] Resend API hiba:", emailError);
      } else {
        console.log("[E-mail Debug] Sikeres küldés! Resend ID:", emailData?.id);
      }
    } catch (err) {
      console.error("[E-mail Debug] Kritikus hiba az email folyamatban:", err);
      // Nem küldünk 500-at, mert az adatbázisba már bekerült a foglalás
    }

    // 6. Siker visszajelzése a frontendnek
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Általános szerverhiba:", error);
    return new Response(JSON.stringify({ error: "Szerverhiba történt." }), { status: 500 });
  }
};