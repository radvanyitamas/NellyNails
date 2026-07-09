// ==========================================
// 1. IMPORTÁLÁSOK ÉS INICIALIZÁLÁS
// ==========================================
import type { APIRoute } from 'astro'; // Az Astro API végpontok típusdefiníciója
import { Resend } from 'resend'; // A Resend e-mail küldő szolgáltatás könyvtára
import { getEmailHtml } from '../../lib/emailTemplate'; // Saját HTML e-mail sablon importálása a vendégnek
import { supabase } from '../../lib/supabase'; // A Supabase adatbázis kliens importálása

// Környezeti változók (env) beolvasása. A biztonságos API kulcsot tartalmazza az e-mail küldéshez.
const apiKey = import.meta.env.RESEND_API_KEY;
// Csak akkor hozzuk létre a Resend klienst, ha létezik az API kulcs, ezzel megelőzve az összeomlást.
const resend = apiKey ? new Resend(apiKey) : null;

// Segédfüggvény egy véletlenszerű, biztonságos lemondási token generálásához (ha a Supabase nem generálja magától)
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ==========================================
// 2. AZ API VÉGPONT DEFINIÁLÁSA (POST KÉRÉS)
// ==========================================
export const POST: APIRoute = async ({ request }) => {
  try {
    // Megnézzük, milyen formátumban érkeztek az adatok
    const contentType = request.headers.get('content-type');
    
    // Változók előkészítése az adatok tárolására
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
    const now = new Date(); // A szerver aktuális ideje

    // Megakadályozzuk, hogy múltbéli időpontra foglaljanak
    if (requestedDate < now) {
      return new Response(JSON.stringify({ error: "Nem foglalhatsz múltbéli időpontot!" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 4/b. ÚJ ELLENŐRZÉS: RENDKÍVÜLI ZÁRVATARTÁS
    // ==========================================
    // Kivonjuk a tiszta dátumot YYYY-MM-DD formátumban
    const inputDateISO = requestedDate.toISOString().split('T')[0];

    // Megnézzük, hogy ez a nap szerepel-e a lezárt napok között
    const { data: isClosedDay } = await supabase
      .from('closed_dates')
      .select('reason')
      .eq('closed_date', inputDateISO)
      .maybeSingle();

    // Ha Nelly lezárta ezt a napot az adminban, visszautasítjuk a foglalást
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
    
    // Javítva az időablak: a kért időponttól visszafele és előre számolunk 3 órát
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs).toISOString();

    // Lekérdezzük a Supabase-ből, van-e már aktív foglalás ebben az időablakban
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
    // 6. ADATBÁZIS MENTÉS ÉS TOKEN GENERÁLÁS
    // ==========================================
    // Létrehozunk egy egyedi, nehezen kitalálható lemondási tokent
    const cancelToken = generateToken();

    // Beszúrjuk az új foglalást a Supabase 'bookings' táblájába
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        email, 
        phone, 
        booking_date: requestedDate.toISOString(), 
        status: 'pending',
        cancel_token: cancelToken // Elmentjük az egyedi tokent a lemondásokhoz!
      }])
      .select().single(); 

    if (dbError || !booking) {
      console.error("Adatbázis hiba beszúráskor:", dbError);
      return new Response(JSON.stringify({ error: "Adatbázis mentési hiba." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 7. E-MAIL KÜLDÉSI FOLYAMAT
    // ==========================================
    if (resend) {
      try {
        const host = request.headers.get('host') || 'nailsbynelly.hu';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const domain = `${protocol}://${host}`;
        
        // JAVÍTVA: A linkek most már a megerősítésnél az ID-t, a lemondásnál a TOKEN-t küldik el az Astro oldalaknak!
        const confirmLink = `${domain}/megerosites?id=${booking.id}`;
        const cancelLink = `${domain}/lemondas?token=${booking.cancel_token}`; 
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

        // --- 7/b. E-MAIL NELLYNEK (ADMIN) ---
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
              
              <p style="font-size: 12px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px;">
                Ez egy automatikus üzenet a nailsbynelly.hu rendszeréből.
              </p>
            </div>
          `
        });

        console.log(`Email-ek elküldve: Vendég (${email}) és Admin (nellirad@gmail.com)`);
      } catch (emailErr) {
        console.error("E-mail hiba:", emailErr);
      }
    }

    // ==========================================
    // 8. SIKERES VÁLASZ A FRONTENDNEK
    // ==========================================
    return new Response(JSON.stringify({ success: true, bookingId: booking.id }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Súlyos szerverhiba:", error);
    return new Response(JSON.stringify({ error: "Váratlan szerverhiba." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};