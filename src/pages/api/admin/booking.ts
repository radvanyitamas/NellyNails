import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { supabase } from '../../../lib/supabase';
import { getEmailHtml } from '../../../lib/emailTemplate';

// Inicializáljuk a Resend klienst a környezeti változókban tárolt API kulccsal
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    // ==========================================
    // 1. ADATOK KINYERÉSE A FORMBÓL
    // ==========================================
    // A kérésből (request) kinyerjük az elküldött form adatokat
    const data = await request.formData();
    const name = data.get('name')?.toString();
    const email = data.get('email')?.toString();
    const phone = data.get('phone')?.toString();
    const dateStr = data.get('date')?.toString();

    // Ellenőrizzük, hogy a kötelező mezők ki vannak-e töltve
    if (!name || !email || !dateStr) {
      return new Response(JSON.stringify({ error: "Minden mező kitöltése kötelező!" }), { status: 400 });
    }

    // A kapott dátum stringet JavaScript Date objektummá alakítjuk
    const requestedDate = new Date(dateStr);

    // ==========================================
    // 2. AZNAPI ÉS MÁSNAPI FOGLALÁSOK TILTÁSA
    // ==========================================
    // Lekérjük a szerver aktuális idejét
    const now = new Date();
    
    // Kiszámoljuk a legkorábbi engedélyezett napot (mai nap + 2 nap = holnapután)
    // Az év, hónap, nap megadásával az órát/percet automatikusan éjfélre (00:00:00) állítja a rendszer,
    // így elkerüljük az időeltolódásból fakadó hibákat.
    const minAllowedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    
    // A vendég által kért dátumból is levágjuk az órákat és perceket a tiszta összehasonlításhoz
    const requestedDayOnly = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate());

    // Ha a kért dátum régebbi, mint a legkorábbi engedélyezett dátum (vagyis ma vagy holnap van)
    if (requestedDayOnly < minAllowedDate) {
      return new Response(
        JSON.stringify({ error: "Aznapra és másnapra már nem tudsz időpontot foglalni! Kérlek, válassz egy későbbi dátumot." }), 
        { status: 400 }
      );
    }

    // ==========================================
    // 3. PRECÍZ ÜTKÖZÉSVIZSGÁLAT (3 ÓRÁS SZABÁLY)
    // ==========================================
    // 3 óra átszámolva milliszekundumba (3 * 60 perc * 60 másodperc * 1000)
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    
    // Megnézzük, van-e olyan foglalás, ami a kért időpont előtt vagy után 3 órán belül van
    // Hozzáadunk/kivonunk 1000 ms-t (1 másodpercet), hogy a hajszálpontos egyezést elkerüljük
    const minTime = new Date(requestedDate.getTime() - threeHoursInMs + 1000).toISOString();
    const maxTime = new Date(requestedDate.getTime() + threeHoursInMs - 1000).toISOString();

    // Lekérdezés a Supabase adatbázisból: van-e ütköző időpont a megadott sávban
    const { data: conflict } = await supabase
      .from('bookings')
      .select('id')
      // Csak a megerősített (confirmed) vagy folyamatban lévő (pending) foglalásokat nézzük
      .or('status.eq.confirmed,status.eq.pending')
      .gt('booking_date', minTime) // Nagyobb, mint a minimum idő
      .lt('booking_date', maxTime) // Kisebb, mint a maximum idő
      .maybeSingle(); // Vagy egyetlen eredményt ad vissza, vagy semmit (null)

    // Ha találtunk ütközést, hibát dobunk és megállítjuk a folyamatot
    if (conflict) {
      return new Response(JSON.stringify({ error: "Ez az időpont ütközik egy másik foglalással (3 órás szabály)!" }), { status: 400 });
    }

    // ==========================================
    // 4. MENTÉS A SUPABASE ADATBÁZISBA
    // ==========================================
    // Ha idáig eljutott a kód, az időpont érvényes és szabad, jöhet a mentés
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        email, 
        phone, 
        booking_date: requestedDate.toISOString(), 
        status: 'pending' // Alapértelmezetten 'pending' (várakozó) státusszal jön létre
      }])
      .select()
      .single();

    // Ha hiba történt az adatbázisba íráskor
    if (dbError) {
      console.error("Supabase adatbázis hiba:", dbError);
      return new Response(JSON.stringify({ error: "Adatbázis hiba történt a mentés során." }), { status: 500 });
    }

    // ==========================================
    // 5. E-MAIL KÜLDÉS ELŐKÉSZÍTÉSE
    // ==========================================
    // Létrehozzuk a linkeket, amik az emailbe kerülnek
    const origin = new URL(request.url).origin; // Az aktuális weboldal gyökér URL-je (pl. https://nailsbynelly.hu)
    const confirmLink = `${origin}/api/confirm?id=${booking.id}`; // Megerősítő link
    const manageLink = `${origin}/manage-booking?token=${booking.cancel_token}`; // Kezelő/lemondó link
    
    // Szépen formázott magyar dátum létrehozása az e-mail szövegéhez (pl: 2026. június 28. 14:00)
    const formattedDate = requestedDate.toLocaleString('hu-HU', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // ==========================================
    // 6. E-MAIL KÜLDÉS (IZOLÁLT HIBAKERESÉSSEL)
    // ==========================================
    // Külön try-catch blokkba tesszük, hogy ha az email küldés elszáll, a foglalás maga már ne vesszen el
    try {
      console.log(`[E-mail Debug] Küldés indítása ide: ${email}`);
      
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Nails by Nelly <onboarding@resend.dev>', // Feladó adatai (ezt élesítéskor a saját domainedre kell cserélni)
        to: [email!], // Címzett (a formból kapott email)
        subject: '🎀 Időpont megerősítése: Nails by Nelly', // Tárgy
        html: getEmailHtml(name!, formattedDate, confirmLink, manageLink) // HTML sablon betöltése
      });

      if (emailError) {
        // Itt fogod látni a pontos hibaüzenetet a VS Code termináljában!
        console.error("[E-mail Debug] Resend API hiba:", emailError);
      } else {
        console.log("[E-mail Debug] Sikeres küldés! Resend ID:", emailData?.id);
      }
    } catch (err) {
      console.error("[E-mail Debug] Kritikus hiba az email folyamatban:", err);
      // Nem küldünk 500-as szerverhibát a frontendnek, mert az adatbázisba sikeresen bekerült a foglalás
    }

    // ==========================================
    // 7. SIKER VISSZAJELZÉSE A FRONTENDNEK
    // ==========================================
    // Minden sikeresen lefutott, visszaküldünk egy 200-as (OK) státuszkódot
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    // Általános, mindenre kiterjedő hibakezelés (ha pl. az adatok kinyerése során hiba történik)
    console.error("Általános szerverhiba:", error);
    return new Response(JSON.stringify({ error: "Szerverhiba történt." }), { status: 500 });
  }
};