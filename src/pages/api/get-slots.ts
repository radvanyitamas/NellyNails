import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  const { data } = await supabase
    .from('bookings')
    .select('booking_date')
    .or('status.eq.confirmed,status.eq.pending');

  // Átalakítjuk a dátumokat úgy, hogy elhagyjuk az időzóna eltolást (Z / +00), 
  // így a naptár pontosan a DB-be mentett helyi órákat fogja vizsgálni elcsúszás nélkül.
  const formattedDates = data?.map(b => {
    if (!b.booking_date) return '';
    // Levágjuk az időzóna jelölést a végéről (pl. '2026-08-03T15:00:00+00:00' -> '2026-08-03T15:00:00')
    return b.booking_date.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
  }).filter(Boolean) || [];

  return new Response(JSON.stringify(formattedDates), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
