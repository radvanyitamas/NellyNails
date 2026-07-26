import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

// Resend inicializálása
const apiKey = import.meta.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Nincs ID megadva' }), { status: 400 });
    }

    // ==========================================
    // 1. ELŐSZÖR LEKÉRJÜK A FOGLALÁST (Hogy tudjuk, kinek küldjük az e-mailt)
    // ==========================================
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, prices(service_name)')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return new Response(JSON.stringify({ error: 'A foglalás nem található vagy már törölve lett.' }), { status: 404 });
    }

    // ==========================================
    // 2. TÖRLÉS AZ ADATBÁZISBÓL
    // ==========================================
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase hiba törléskor:', error);
      return new Response(JSON.stringify({ error: 'Nem sikerült törölni az adatbázisból.' }), { status: 500 });
    }

    // ==========================================
    // 3. E-MAIL KÜLDÉSI FOLYAMAT (RESEND)
    // ==========================================
    if (resend && booking.email) {
      try {
        // Dátum formázása az e-mailhez (Időzóna eltolódás nélkül)
        const cleanDateStr = booking.booking_date.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
        const [datePart, timePart] = cleanDateStr.split('T');
        const [year, month, day] = datePart.split('-');
        const [hourStr, minuteStr] = timePart.split(':');
        const formattedDate = `${year}. ${month}. ${day}. ${hourStr}:${minuteStr}`;
        const serviceName = booking.prices?.service_name || 'Műköröm / Szolgáltatás';

        // --- A. ÉRTESÍTÉS A VENDÉGNEK ---
        await resend.emails.send({
          from: 'Nails by Nelly <info@nailsbynelly.hu>',
          to: [booking.email],
          subject: '❌ Időpont törölve: Nails by Nelly',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #db2777; border-bottom: 2px solid #fbcfe8; padding-bottom: 10px;">Foglalás törölve</h2>
              <p>Szia <strong>${booking.name}</strong>!</p>
              <p>A(z) <strong>${formattedDate}</strong> időpontra szóló foglalásod törlésre került a rendszerből.</p>
              <p>Ha a jövőben szeretnél új időpontot foglalni, bármikor megteheted a weboldalon!</p>
              <br>
              <p style="color: #666; font-size: 14px;">Üdvözlettel,<br><strong>Nails by Nelly</strong></p>
            </div>
          `
        });

        // --- B. ÉRTESÍTÉS NELLYNEK (ADMIN) ---
        await resend.emails.send({
          from: 'Nails by Nelly System <info@nailsbynelly.hu>',
          to: ['nellirad@gmail.com'],
          subject: `⚠️ IDŐPONT TÖRÖLVE: ${booking.name}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #ef4444; border-bottom: 2px solid #fecdd3; padding-bottom: 10px;">Egy időpont törölve lett!</h2>
              <p>Szia Nelly! Az alábbi időpont felszabadult a naptáradban, mert törölték a rendszeredből:</p>
              
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Vendég neve:</strong> ${booking.name}</p>
                <p><strong>Törölt időpont:</strong> ${formattedDate}</p>
                <p><strong>Szolgáltatás:</strong> ${serviceName}</p>
                <p><strong>Telefonszám:</strong> ${booking.phone || 'Nincs megadva'}</p>
                <p><strong>E-mail cím:</strong> ${booking.email}</p>
              </div>

              <p style="color: #666; font-size: 13px;">Ez az idősáv újra foglalhatóvá vált a weboldalon.</p>
            </div>
          `
        });

      } catch (emailErr) {
        console.error("Hiba a lemondó e-mail küldésekor:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Szerverhiba történt' }), { status: 500 });
  }
};
