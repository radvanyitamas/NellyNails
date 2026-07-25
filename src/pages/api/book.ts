// ==========================================
// 1. IMPORTÁLÁSOK ÉS INICIALIZÁLÁS
// ==========================================
import type { APIRoute } from 'astro'; 
import { Resend } from 'resend'; 
import { getEmailHtml } from '../../lib/emailTemplate'; 
import { supabase } from '../../lib/supabase'; 

const apiKey = import.meta.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// ==========================================
// 2. AZ API VÉGPONT DEFINIÁLÁSA (POST KÉRÉS)
// ==========================================
export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type');
    let name, email, phone, dateStr, serviceId;

    // ==========================================
    // 3. ADATOK KINYERÉSE A KÉRÉSBŐL
    // ==========================================
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      name = body.name;
      email = body.email;
      phone = body.phone;
      dateStr = body.date || body.booking_date; 
      serviceId = body.service_id; 
    } else {
      const data = await request.formData();
      name = data.get('name')?.toString();
      email = data.get('email')?.toString();
      phone = data.get('phone')?.toString();
      dateStr = data.get('date')?.toString();
      serviceId = data.get('service_id')?.toString();
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

    // Tisztítjuk a dátum stringet, levágjuk az esetleges UTC / időzóna jeleket (+ vagy Z), hogy fixen lokális idő maradjon
    const cleanDateStr = dateStr.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
    const requestedDate = new Date(cleanDateStr);
    const now = new Date(); 

    if (requestedDate < now) {
      return new Response(JSON.stringify({ error: "Nem foglalhatsz múltbéli időpontot!" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 4/b. RENDKÍVÜLI ZÁRVATARTÁS ELLENŐRZÉSE
    // ==========================================
    const inputDateISO = cleanDateStr.split('T')[0];

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
    // 4/c. SZOLGÁLTATÁS ÉS IDŐTARTAM LEKÉRÉSE
    // ==========================================
    let durationMinutes = 180; 

    if (serviceId) {
      const { data: serviceData } = await supabase
        .from('prices')
        .select('duration_minutes')
        .eq('id', serviceId)
        .maybeSingle();

      if (serviceData && serviceData.duration_minutes) {
        durationMinutes = serviceData.duration_minutes;
      }
    }

    // ==========================================
    // 5. ÜTKÖZÉSVIZSGÁLAT
    // ==========================================
    const durationMs = durationMinutes * 60 * 1000;
    const requestedTime = requestedDate.getTime();
    const requestedEndTime = requestedTime + durationMs;

    const startOfDay = new Date(cleanDateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(cleanDateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('booking_date, prices(duration_minutes)')
      .or('status.eq.confirmed,status.eq.pending')
      .gte('booking_date', startOfDay.toISOString())
      .lte('booking_date', endOfDay.toISOString());

    let hasConflict = false;

    if (existingBookings) {
      for (const booking of existingBookings) {
        const cleanExistingStr = booking.booking_date.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
        const bookedStart = new Date(cleanExistingStr).getTime();
        const bookedDuration = (booking.prices as any)?.duration_minutes || 180;
        const bookedEnd = bookedStart + (bookedDuration * 60 * 1000);

        if (requestedTime < bookedEnd && requestedEndTime > bookedStart) {
          hasConflict = true;
          break;
        }
      }
    }

    if (hasConflict) {
      return new Response(JSON.stringify({ error: "Ez az időpont már ütközik egy másik foglalással!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 6. ADATBÁZIS MENTÉS (Időzóna nélkül mentjük)
    // ==========================================
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        email, 
        phone, 
        booking_date: cleanDateStr, // Időzóna jelölés nélküli tiszta dátum string
        status: 'pending',
        price_id: serviceId || null 
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
        
        const confirmLink = `${domain}/confirm-booking?id=${booking.id}`;
        const cancelLink = `${domain}/manage-booking?token=${booking.cancel_token}`; 
        const adminLink = `${domain}/admin`; 
        
        const formattedDate = requestedDate.toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        // --- GOOGLE NAPTÁR LINK IDŐZÓNA NÉLKÜL (FIX HELYI IDŐ) ---
        const endDate = new Date(requestedEndTime);
        
        // Ez a függvény direkt kiszedi a helyi év-hónap-nap-óra-perc értéket, és nem konvertál UTC-re!
        const formatGCalDatePure = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
        };

        const gCalStartTime = formatGCalDatePure(requestedDate);
        const gCalEndTime = formatGCalDatePure(endDate);
        
        const gCalTitle = encodeURIComponent(`${name} időpontot foglalt`);
        const gCalDetails = encodeURIComponent(`Vendég neve: ${name}\nTelefonszám: ${phone || 'Nincs megadva'}\nE-mail cím: ${email}`);
        
        // Megadjuk a céges naptárnak, hogy ez fixen helyi (Budapest) idő, ne csúsztassa el
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalStartTime}/${gCalEndTime}&details=${gCalDetails}&ctz=Europe/Budapest`;

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

              <p style="margin-top: 30px; margin-bottom: 20px;">A foglalás kezeléséhez vagy naptárba mentéséhez használd az alábbi gombokat:</p>
              
              <div style="display: flex; flex-direction: column; gap: 15px; align-items: flex-start;">
                <a href="${adminLink}" style="display: inline-block; background-color: #db2777; color: white; padding: 12px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; text-align: center;">
                  Admin felület megnyitása
                </a>
                
                <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #fdf2f8; color: #db2777; border: 2px solid #db2777; padding: 10px 23px; text-decoration: none; border-radius: 50px; font-weight: bold; text-align: center;">
                  📅 Hozzáadás Google Naptárhoz
                </a>
              </div>
            </div>
          `
        });

        console.log(`Email sikeresen kiküldve.`);
      } catch (emailErr) {
        console.error("E-mail hiba (az adatbázis mentés sikeres volt):", emailErr);
      }
    }

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
