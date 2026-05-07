import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';
import { getConfirmationEmailHtml } from '../../lib/emailTemplate'; // IMPORTÁLD BE

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();
    const name = data.get('name')?.toString() || '';
    const email = data.get('email')?.toString() || '';
    const phone = data.get('phone')?.toString() || '';
    const dateStr = data.get('date')?.toString() || '';

    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { status: 400 });
    }

    const requestedDate = new Date(dateStr);
    
    // 1. Ütközés vizsgálat (3 órás szabály)
    const threeHoursInMs = 3 * 60 * 60 * 1000;
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
      return new Response(JSON.stringify({ error: "Ez az időpont már foglalt!" }), { status: 400 });
    }

    // 2. Mentés Supabase-be
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ name, email, phone, booking_date: requestedDate.toISOString(), status: 'pending' }])
      .select().single();

    if (dbError) return new Response(JSON.stringify({ error: "Adatbázis hiba." }), { status: 500 });

    // 3. Email küldése a KISZERVEZETT SABLONNAL
    const confirmLink = `${new URL(request.url).origin}/api/confirm?id=${booking.id}`;
    
    await resend.emails.send({
      from: 'Nails by Nelly <onboarding@resend.dev>',
      to: email,
      subject: '🎀 Megerősítés szükséges: Időpontfoglalás',
      html: getConfirmationEmailHtml(name, dateStr, confirmLink) // CSAK ENNYI MARADT ITT
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Szerverhiba" }), { status: 500 });
  }
};