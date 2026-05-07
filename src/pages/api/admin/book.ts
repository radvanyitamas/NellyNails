import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getEmailHtml } from '../../../lib/emailTemplate';
import { supabase } from '../../../lib/supabase';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
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
    
    // 1. Ütközésvizsgálat (Oda-vissza 3 óra)
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
      return new Response(JSON.stringify({ error: "Ez az időpont ütközik egy másik foglalással!" }), { status: 400 });
    }

    // 2. Mentés az adatbázisba
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, email, phone, 
        booking_date: requestedDate.toISOString(), 
        status: 'pending' 
      }])
      .select().single();

    if (dbError) return new Response(JSON.stringify({ error: "Adatbázis hiba történt." }), { status: 500 });

    // 3. Adatok előkészítése az e-mailhez
    const origin = new URL(request.url).origin;
    const confirmLink = `${origin}/api/confirm?id=${booking.id}`;
    const manageLink = `${origin}/kezeles?token=${booking.cancel_token}`;
    const formattedDate = requestedDate.toLocaleString('hu-HU', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // 4. E-mail küldés (Izolált try-catch, hogy a Resend hiba ne állítsa le a folyamatot)
    try {
      await resend.emails.send({
        from: 'Nails by Nelly <onboarding@resend.dev>',
        to: [email!],
        subject: '🎀 Időpont megerősítése: Nails by Nelly',
        html: getEmailHtml(name!, formattedDate, confirmLink, manageLink)
      });
      console.log("Email sikeresen elküldve ide:", email);
    } catch (emailErr) {
      console.error("Email küldési hiba:", emailErr);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Szerver hiba:", error);
    return new Response(JSON.stringify({ error: "Szerverhiba történt." }), { status: 500 });
  }
};