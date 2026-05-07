import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Nincs ID megadva' }), { status: 400 });
    }

    // Törlés az adatbázisból ID alapján
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase hiba törléskor:', error);
      return new Response(JSON.stringify({ error: 'Nem sikerült törölni az adatbázisból.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Szerverhiba történt' }), { status: 500 });
  }
};