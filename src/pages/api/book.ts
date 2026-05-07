import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getEmailHtml } from '../../lib/emailTemplate';
import { supabase } from '../../lib/supabase';

// Resend inicializálása a környezeti változóból
const apiKey = import.meta.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. ADATOK BEOLVASÁSA ÉS ELŐKÉSZÍTÉSE
    const contentType = request.headers.get('content-type');
    let name, email, phone, dateStr;

    // Támogatjuk a JSON és a FormData formátumot is a maximális kompatibilitás érdekében
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

    // Alapvető validáció: ha hiányzik adat, hibaüzenetet küldünk vissza
    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestedDate = new Date(dateStr);
    const now = new Date();

    // --- ÚJ ELLENŐRZÉS: Múltbéli időpont megakadályozása ---
    // Ha a kért időpont korábbi, mint a szerver jelenlegi ideje (óra/perc pontossággal)
    if (requestedDate < now) {
      return new Response(JSON.stringify({ error: "Nem foglalhatsz múltbéli időpontot! Kérlek, válassz egy későbbi időpontot." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const threeHoursInMs = 3 * 60 * 60 * 1000;
    
    // 2. ÜTKÖZÉSVIZSGÁLAT (IDŐPONT FOGLALTSÁG ELLENŐRZÉSE)
    // Megnézzük, hogy van-e már megerősített vagy függő foglalás 3 órás környezetben
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs + 1000).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs - 1000).toISOString();

    const { data: conflict, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .or('status.eq.confirmed,status.eq.pending')
      .gt('booking_date', minTime)
      .lt('booking_date', maxTime)
      .maybeSingle();

    if (conflict) {
      return new Response(JSON.stringify({ error: "Ez az időpont már foglalt vagy túl közel van egy másik foglaláshoz (minimum 3 óra különbség szükséges)!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. MENTÉS A SUPABASE ADATBÁZISBA
    // Létrehozzuk a foglalást 'pending' (függő) státusszal
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
      console.error("Adatbázis mentési hiba:", dbError);
      return new Response(JSON.stringify({ error: "Hiba történt az adatok mentésekor az adatbázisba." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. LINKEK GENERÁLÁSA ÉS E-MAIL KÜLDÉSE
    if (resend) {
      try {
        const origin = new URL(request.url).origin;
        
        // A linkek a szép Astro oldalakra mutatnak a megerősítéshez és lemondáshoz
        const confirmLink = `${origin}/megerosites?id=${booking.id}`;
        const cancelLink = `${origin}/lemondas?id=${booking.id}`; 
        
        const formattedDate = requestedDate.toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        // E-mail küldése a Resend segítségével
        await resend.emails.send({
          from: 'Nails by Nelly <onboarding@resend.dev>',
          to: [email],
          subject: '🎀 Időpont megerősítése: Nails by Nelly',
          html: await getEmailHtml(name, formattedDate, confirmLink, cancelLink)
        });
        
        console.log(`Visszaigazoló email elküldve ide: ${email}`);
      } catch (emailErr) {
        console.error("E-mail küldési hiba:", emailErr);
        // A foglalás ettől még sikeres az adatbázisban
      }
    } else {
      console.warn("A levélküldés elmaradt, mert nincs beállítva a RESEND_API_KEY!");
    }

    // 5. VÉGSŐ VÁLASZ A FRONTENDNEK
    return new Response(JSON.stringify({ success: true, bookingId: booking.id }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Kritikus hiba a szerveren:", error);
    return new Response(JSON.stringify({ error: "Váratlan szerverhiba történt a feldolgozás során." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};