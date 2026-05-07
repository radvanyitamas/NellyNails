import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. JSON beolvasása
    const body = await request.json();
    const token = body.token;

    console.log("[Cancel API] Token érkezett:", token);

    if (!token) {
      return new Response(JSON.stringify({ error: "Nincs azonosító!" }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 2. Törlés
    const { error, count } = await supabase
      .from('bookings')
      .delete({ count: 'exact' })
      .eq('cancel_token', token);

    if (error) {
        console.error("DB hiba:", error.message);
        return new Response(JSON.stringify({ error: "Adatbázis hiba" }), { status: 500 });
    }

    if (count === 0) {
      return new Response(JSON.stringify({ error: "A foglalás már nem létezik." }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Kritikus hiba:", err);
    return new Response(JSON.stringify({ error: "Szerverhiba" }), { status: 500 });
  }
};