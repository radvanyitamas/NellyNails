import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getEmailHtml } from '../../lib/emailTemplate';
import { supabase } from '../../lib/supabase';

const apiKey = import.meta.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type');
    let name, email, phone, dateStr;

    if (contentType?.includes('application/json')) {
      const body = await request.json();
      name = body.name;
      email = body.email;
      phone = body.phone;
      dateStr = body.date || body.booking_date;
    } else {
      const data = await request.formData();
      name = data.get('name')?.toString();
      email = data.get('email')?.toString();
      phone = data.get('phone')?.toString();
      dateStr = data.get('date')?.toString();
    }

    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestedDate = new Date(dateStr);
    const now = new Date();

    if (requestedDate < now) {
      return new Response(JSON.stringify({ error: "Nem foglalhatsz múltbéli időpontot!" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
      return new Response(JSON.stringify({ error: "Ez az időpont már foglalt!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        email, 
        phone, 
        booking_date: requestedDate.toISOString(), 
        status: 'pending' 
      }])
      .select().single();

    if (dbError || !booking) {
      return new Response(JSON.stringify({ error: "Adatbázis mentési hiba." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (resend) {
      try {
        // --- DINAMIKUS LINK GENERÁLÁS (DEV ÉS PROD) ---
        const host = request.headers.get('host') || 'nailsbynelly.hu';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const domain = `${protocol}://${host}`;
        
        const confirmLink = `${domain}/megerosites?id=${booking.id}`;
        const cancelLink = `${domain}/lemondas?id=${booking.id}`; 
        
        const formattedDate = requestedDate.toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        await resend.emails.send({
          from: 'Nails by Nelly <info@nailsbynelly.hu>',
          to: [email],
          subject: '🎀 Időpont megerősítése: Nails by Nelly',
          html: await getEmailHtml(name, formattedDate, confirmLink, cancelLink)
        });
      } catch (emailErr) {
        console.error("E-mail hiba:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, bookingId: booking.id }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Váratlan szerverhiba." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};