import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

// Resend kliens létrehozása a környezeti változóból
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, id, reason } = body; // Egyszerre kezeljük a vendég 'token'-jét és az admin 'id/reason' párosát!

    // =========================================================================
    // 1. ESET: VENDÉG MÓD (A vendég kattintott a lemondó linkre a token alapján)
    // =========================================================================
    if (token) {
      // Először lekérjük a foglalás részleteit a token alapján, hogy tudjuk, ki mondta le
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('name, email, booking_date')
        .eq('cancel_token', token)
        .maybeSingle();

      if (fetchError || !booking) {
        return new Response(JSON.stringify({ error: "A foglalás nem található vagy már lemondták." }), { status: 404 });
      }

      // Töröljük a foglalást a táblából a token segítségével
      const { error: delError } = await supabase
        .from('bookings')
        .delete()
        .eq('cancel_token', token);

      if (delError) {
        return new Response(JSON.stringify({ error: "Hiba a törlés során" }), { status: 500 });
      }

      // Értesítő e-mail küldése NELLYNEK, hogy szabaddá vált az időpont
      try {
        const formattedDate = new Date(booking.booking_date).toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        await resend.emails.send({
          from: 'Nails by Nelly System <info@nailsbynelly.hu>', // Ha a saját domain még nincs kész, itt maradhat az info@nailsbynelly.hu vagy az onboarding@resend.dev
          to: ['nellirad@gmail.com'], // A te címed
          subject: '💔 Időpont lemondva - Nails by Nelly',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ef4444; border-bottom: 2px solid #fee2e2; padding-bottom: 10px;">Időpont lemondás értesítés</h2>
                <p>Szia Nelly! Egy vendéged lemondta az időpontját a weboldalon keresztül. Ez a sáv felszabadult a naptáradban:</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Vendég neve:</strong> ${booking.name}</p>
                    <p><strong>Volt időpont:</strong> ${formattedDate}</p>
                    <p><strong>E-mail címe:</strong> ${booking.email}</p>
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">Ez egy automatikus értesítés a rendszeredből.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error("Nem sikerült Nellynek értesítést küldeni:", emailErr);
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // =========================================================================
    // 2. ESET: ADMIN MÓD (Te törlöd a foglalást a belső Vezérlőpultról ID alapján)
    // =========================================================================
    if (id) {
      // Lekérjük az adatokat az ID alapján az e-mailhez
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('email, name, booking_date')
        .eq('id', id)
        .single();

      if (fetchError || !booking) {
        return new Response(JSON.stringify({ error: "Foglalás nem található" }), { status: 404 });
      }

      // Törlés az adatbázisból ID alapján
      const { error: delError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (delError) {
        return new Response(JSON.stringify({ error: "Hiba a törlés során" }), { status: 500 });
      }

      // Értesítő e-mail küldése a VENDÉGNEK az indoklással
      try {
        const formattedDate = new Date(booking.booking_date).toLocaleString('hu-HU', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        await resend.emails.send({
          from: 'Nails by Nelly <info@nailsbynelly.hu>', // Vagy onboarding@resend.dev, ha még tesztelsz
          to: [booking.email],
          subject: 'Foglalásod törölve lett - Nails by Nelly',
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #fce7f3; border-radius: 30px; text-align: center;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Szia ${booking.name}! 🎀</h2>
                <p style="color: #64748b;">Sajnálattal értesítünk, hogy a <strong>${formattedDate}</strong> időpontra leadott foglalásod törlésre került.</p>
                
                <div style="background-color: #fff1f2; border: 1px dashed #fda4af; border-radius: 20px; padding: 20px; margin: 25px 0; text-align: left;">
                    <span style="color: #9f1239; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">A törlés indoka:</span>
                    <p style="color: #1e293b; font-weight: bold; margin: 5px 0 0 0; font-style: italic;">${reason || 'Nem lett megadva indok.'}</p>
                </div>
                
                <p style="color: #64748b;">Várunk szeretettel egy másik alkalommal! Ha új időpontot szeretnél foglalni, kattints ide:</p>
                <a href="https://nailsbynelly.hu" style="display: inline-block; background-color: #db2777; color: white; padding: 14px 30px; text-decoration: none; border-radius: 20px; font-weight: bold; margin-top: 15px; box-shadow: 0 10px 20px rgba(219, 39, 119, 0.15);">Új időpont választása</a>
            </div>
          `
        });
      } catch (emailErr) {
        console.error("Nem sikerült a vendégnek lemondó levelet küldeni:", emailErr);
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ha se nem token, se nem ID nem jött a formban
    return new Response(JSON.stringify({ error: "Hiányzó paraméterek (ID vagy Token)" }), { status: 400 });

  } catch (error) {
    console.error("Váratlan hiba a cancel API-ban:", error);
    return new Response(JSON.stringify({ error: "Szerverhiba" }), { status: 500 });
  }
};