import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');

  if (!id) return new Response("Hiányzó ID", { status: 400 });

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) return new Response("Hiba", { status: 500 });

  return new Response(JSON.stringify({ success: true }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};