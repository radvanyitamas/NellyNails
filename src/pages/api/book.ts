// ==========================================
// 1. IMPORTÁLÁSOK ÉS INICIALIZÁLÁS
// ==========================================
import type { APIRoute } from 'astro'; 
import { Resend } from 'resend'; 
import { getEmailHtml } from '../../lib/emailTemplate'; 
import { supabase } from '../../lib/supabase'; 

// Értékes API kulcs beolvasása a környezeti változókból
const apiKey = import.meta.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// ==========================================
// 2. AZ API VÉGPONT DEFINIÁLÁSA (POST KÉRÉS)
// ==========================================
export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type');
    let name, email, phone, dateStr;

    // ==========================================
    // 3. ADATOK KINYERÉSE A KÉRÉSBŐL
    // ==========================================
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

    // ==========================================
    // 4. BEMENETI ADATOK ELLENŐRZÉSE (VALIDÁCIÓ)
    // ==========================================
    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestedDate = new Date(dateStr);
    const now = new Date(); 

    // Múltbéli időpont kiszűrése
    if (requestedDate < now) {
      return new Response(JSON.stringify({ error: "Nem foglalhatsz múltbéli időpontot!" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 4/b. RENDKÍVÜLI ZÁRVATARTÁS ELLENŐRZÉSE
    // ==========================================
    // Átalakítjuk a kért napot tiszta YYYY-MM-DD formátumra
    const inputDateISO = requestedDate.toISOString().split('T')[0];

    // Megnézzük, Nelly lezárta-e ezt a napot a naptárban
    const { data: isClosedDay } = await supabase
      .from('closed_dates')
      .select('reason')
      .eq('closed_date', inputDateISO)
      .maybeSingle();

    if (isClosedDay) {
      return new Response(JSON.stringify({ error: `Ezen a napon zárva tartunk! Indok: ${isClosedDay.reason || 'Szabadság'}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 5. ÜTKÖZÉSVIZSGÁLAT (3 ÓRÁS SZABÁLY)
    // ==========================================
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs).toISOString();

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

    // ==========================================
    // 6. ADATBÁZIS MENTÉS
    // ==========================================
    // Nem küldünk kézzel generált szöveges tokent, a Supabase automatikusan legenerálja 
    // a sémában lévő default biztonságos UUID-t, amit a select().single() azonnal visszaad.
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
      console.error("Adatbázis hiba beszúráskor:", dbError.message);
      return new Response(JSON.stringify({ error: "Adatbázis mentési hiba." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 7. E-MAIL KÜLDÉSI FOLYAMAT (RESEND)
    // ==========================================
    if (resend) {
      try {
        const host = request.headers.get('host') || 'nailsbynelly.hu';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const domain = `${protocol}://${host}`;
        
        // JAVÍTVA: A lemondó link hajszálpontosan a /kezeles oldalra mutat a Supabase UUID tokenjével
        const confirmLink = `${domain}/megerosites?id=${booking.id}`;
        const cancelLink = `${domain}/kezeles?token=${booking.cancel_token}`; 
        const adminLink = `${domain}/admin`; 
        
        const formattedDate = requestedDate.toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        // --- 7/a. E-MAIL A VENDÉGNEK ---
        await resend.emails.send({
          from: 'Nails by Nelly <info@nailsbynelly.hu>',
          to: [email], 
          subject: '🎀 Időpont megerősítése: Nails by Nelly',
          html: await getEmailHtml(name, formattedDate, confirmLink, cancelLink)
        });

        // --- 7/b. E-MAIL NELLYNEK (ADMIN ÉRTESÍTÉS) ---
        await resend.emails.send({
          from: 'Nails by Nelly System <info@nailsbynelly.hu>',
          to: ['nellirad@gmail.com'], 
          subject: '✨ ÚJ IDŐPONT FOGLALÁS ÉRKEZETT!',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #db2777; border-bottom: 2px solid #fbcfe8; padding-bottom: 10px;">Új foglalási értesítés</h2>
              <p>Szia Nelly! Új időpontot foglaltak a weboldalon. Itt vannak a részletek:</p>
              
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Vendég neve:</strong> ${name}</p>
                <p><strong>Időpont:</strong> ${formattedDate}</p>
                <p><strong>Telefonszám:</strong> ${phone || 'Nincs megadva'}</p>
                <p><strong>E-mail cím:</strong> ${email}</p>
              </div>

              <p style="margin-top: 30px;">A foglalás kezeléséhez kattints az alábbi gombra:</p>
              <a href="${adminLink}" style="display: inline-block; background-color: #db2777; color: white; padding: 12px 25px; text-decoration: none; border-radius: 50px; font-weight: bold;">Admin felület megnyitása</a>
            </div>
          `
        });

        console.log(`Email sikeresen kiküldve.`);
      } catch (emailErr) {
        console.error("E-mail hiba (az adatbázis mentés sikeres volt):", emailErr);
      }
    }

    // Sikeres visszajelzés a frontend naptárnak
    return new Response(JSON.stringify({ success: true, bookingId: booking.id }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Súlyos váratlan szerverhiba:", error);
    return new Response(JSON.stringify({ error: "Váratlan szerverhiba." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};