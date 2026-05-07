import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async () => {
  const { data } = await supabase
    .from('bookings')
    .select('booking_date')
    .or('status.eq.confirmed,status.eq.pending');

  return new Response(JSON.stringify(data?.map(b => b.booking_date) || []), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};