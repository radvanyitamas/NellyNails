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

// ==========================================
// 2. AZ API VÉGPONT DEFINIÁLÁSA (POST KÉRÉS)
// ==========================================
// Ez a függvény fut le, amikor a frontendről elküldik a foglalási űrlapot (POST metódussal)
export const POST: APIRoute = async ({ request }) => {
  try {
    // Megnézzük, milyen formátumban érkeztek az adatok (JSON vagy hagyományos űrlap)
    const contentType = request.headers.get('content-type');
    
    // Változók előkészítése az adatok tárolására
    let name, email, phone, dateStr;

    // ==========================================
    // 3. ADATOK KINYERÉSE A KÉRÉSBŐL
    // ==========================================
    if (contentType?.includes('application/json')) {
      // Ha JSON formátumban jött (pl. fetch API-val React/Vue kliensből)
      const body = await request.json();
      name = body.name;
      email = body.email;
      phone = body.phone;
      // Kezeli azt is, ha 'date' vagy 'booking_date' néven jön a dátum
      dateStr = body.date || body.booking_date; 
    } else {
      // Ha hagyományos FormData-ként érkezett (alapértelmezett HTML form beküldés)
      const data = await request.formData();
      name = data.get('name')?.toString();
      email = data.get('email')?.toString();
      phone = data.get('phone')?.toString();
      dateStr = data.get('date')?.toString();
    }

    // ==========================================
    // 4. BEMENETI ADATOK ELLENŐRZÉSE (VALIDÁCIÓ)
    // ==========================================
    // Ha valamelyik kötelező mező hiányzik, azonnal visszadobunk egy 400-as hibát
    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dátum objektummá alakítjuk a kapott dátum stringet
    const requestedDate = new Date(dateStr);
    const now = new Date(); // A szerver aktuális (mostani) ideje

    // Megakadályozzuk, hogy múltbéli időpontra foglaljanak
    if (requestedDate < now) {
      return new Response(JSON.stringify({ error: "Nem foglalhatsz múltbéli időpontot!" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 5. ÜTKÖZÉSVIZSGÁLAT (3 ÓRÁS SZABÁLY)
    // ==========================================
    // 3 óra kiszámítása milliszekundumban
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    
    // Meghatározzuk a "tiltott zónát": a kért időpont előtti és utáni 3 óra.
    // A +/- 1000 ms (1 mp) azért kell, hogy a hajszálpontos egyezésnél ne legyen hiba.
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs + 1000).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs - 1000).toISOString();

    // Lekérdezzük a Supabase-ből, van-e már foglalás ebben az időablakban
    const { data: conflict } = await supabase
      .from('bookings')
      .select('id')
      .or('status.eq.confirmed,status.eq.pending') // Csak az elfogadott vagy függőben lévő foglalások számítanak (a lemondottak nem)
      .gt('booking_date', minTime) // Nagyobb, mint a minimum idő
      .lt('booking_date', maxTime) // Kisebb, mint a maximum idő
      .maybeSingle(); // Vagy talál egyet, vagy nullát ad vissza

    // Ha van ütközés, visszadobjuk a foglalást
    if (conflict) {
      return new Response(JSON.stringify({ error: "Ez az időpont már foglalt!" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 6. ADATBÁZIS MENTÉS
    // ==========================================
    // Beszúrjuk az új foglalást a Supabase 'bookings' táblájába
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        email, 
        phone, 
        booking_date: requestedDate.toISOString(), 
        status: 'pending' // 'pending' (várakozó) státuszt kap, amíg a vendég meg nem erősíti
      }])
      .select().single(); // Visszakérjük a létrehozott sor adatait (pl. az ID-t a linkekhez)

    // Ha hiba volt a mentésnél, vagy nem kaptunk vissza adatot
    if (dbError || !booking) {
      return new Response(JSON.stringify({ error: "Adatbázis mentési hiba." }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // 7. E-MAIL KÜLDÉSI FOLYAMAT
    // ==========================================
    // Csak akkor próbálunk e-mailt küldeni, ha a Resend kliens létrejött (van API kulcs)
    if (resend) {
      try {
        // Dinamikus domain generálás (fontos, hogy lokális tesztelésnél http://localhost, élesben https://nailsbynelly.hu legyen)
        const host = request.headers.get('host') || 'nailsbynelly.hu';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const domain = `${protocol}://${host}`;
        
        // E-mailben kiküldendő linkek összeállítása a foglalás ID-jával
        const confirmLink = `${domain}/megerosites?id=${booking.id}`;
        const cancelLink = `${domain}/lemondas?id=${booking.id}`; 
        const adminLink = `${domain}/admin`; // Az admin oldal elérhetősége
        
        // Dátum szép, magyar formátumúra alakítása az e-mailek szövegéhez
        const formattedDate = requestedDate.toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        // --- 7/a. E-MAIL A VENDÉGNEK ---
        // Visszaigazolást kérünk a vendégtől a 'getEmailHtml' sablon felhasználásával
        await resend.emails.send({
          from: 'Nails by Nelly <info@nailsbynelly.hu>',
          to: [email], // A formban megadott e-mail cím
          subject: '🎀 Időpont megerősítése: Nails by Nelly',
          html: await getEmailHtml(name, formattedDate, confirmLink, cancelLink)
        });

        // --- 7/b. E-MAIL NELLYNEK (ADMIN) ---
        // Értesítés a tulajdonosnak, hogy új foglalás érkezett a rendszerbe
        await resend.emails.send({
          from: 'Nails by Nelly System <info@nailsbynelly.hu>',
          to: ['nellirad@gmail.com'], // A te e-mail címed
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
              
              <p style="font-size: 12px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #eee; pt: 10px;">
                Ez egy automatikus üzenet a nailsbynelly.hu rendszeréből.
              </p>
            </div>
          `
        });

        console.log(`Email-ek elküldve: Vendég (${email}) és Admin (nellirad@gmail.com)`);
      } catch (emailErr) {
        // Ha csak az e-mail küldés omlik össze, azt csak logoljuk, 
        // de nem adunk hibaüzenetet a vendégnek, mert a foglalása már bekerült az adatbázisba.
        console.error("E-mail hiba:", emailErr);
      }
    }

    // ==========================================
    // 8. SIKERES VÁLASZ A FRONTENDNEK
    // ==========================================
    // Ha minden rendben lezajlott, 200-as OK státusszal jelezzük a frontendnek a sikert
    return new Response(JSON.stringify({ success: true, bookingId: booking.id }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Általános biztonsági háló: ha bárhol a kódban kivétel (exception) dobódik, 
    // egy biztonságos 500-as szerverhibával térünk vissza, hogy ne omoljon össze a backend.
    return new Response(JSON.stringify({ error: "Váratlan szerverhiba." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};