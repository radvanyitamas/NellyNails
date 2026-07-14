import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ url, redirect }) => {
  const id = url.searchParams.get('id');
  if (!id) return redirect('/?error=invalid');

  // 1. Megkeressük a foglalást a megerősítés előtt, hogy tudjuk a dátumot
  const { data: booking } = await supabase
    .from('bookings')
    .select('booking_date, name')
    .eq('id', id)
    .single();

  if (!booking) return redirect('/?error=not_found');

  // 2. Státusz frissítése
  await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);

  // 3. Átirányítás a dátummal és névvel paraméterben
  const searchParams = new URLSearchParams({
    date: booking.booking_date,
    name: booking.name
  });

  return redirect(`/thank-you?${searchParams.toString()}`);
};