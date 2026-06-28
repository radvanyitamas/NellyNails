import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, reason } = await request.json();

    if (!id) return new Response("Hiányzó ID", { status: 400 });

    // 1. Először lekérjük az adatokat, hogy tudjunk kinek küldeni emailt
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('email, name, booking_date')
      .eq('id', id)
      .single();

    if (fetchError || !booking) return new Response("Foglalás nem található", { status: 404 });

    // 2. Törlés az adatbázisból
    const { error: delError } = await supabase.from('bookings').delete().eq('id', id);
    if (delError) return new Response("Hiba a törlés során", { status: 500 });

    // 3. Email küldése a vendégnek
    const formattedDate = new Date(booking.booking_date).toLocaleString('hu-HU', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    await resend.emails.send({
      from: 'Nails by Nelly <onboarding@resend.dev>', // Ezt írd át a saját domainedre!
      to: [booking.email],
      subject: 'Foglalásod törölve lett - Nails by Nelly',
      html: `
        <div style="font-family: sans-serif;">
            <h2>Szia ${booking.name}!</h2>
            <p>Sajnálattal értesítünk, hogy a <strong>${formattedDate}</strong> időpontod törlésre került.</p>
            <p><strong>A törlés indoka:</strong><br/>${reason || 'Nem lett megadva indok.'}</p>
            <p>Várunk szeretettel egy másik időpontban!</p>
        </div>
      `
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response("Szerverhiba", { status: 500 });
  }
};