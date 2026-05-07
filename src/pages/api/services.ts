import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// Új ár hozzáadása
export const POST: APIRoute = async ({ request }) => {
  const { service_name, price_value, category_id, description } = await request.json();
  const { error } = await supabase.from('prices').insert([{ 
    service_name, 
    price_value, 
    category_id,
    description 
  }]);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

// Módosítás
export const PATCH: APIRoute = async ({ request }) => {
  const { id, service_name, price_value, description } = await request.json();
  const { error } = await supabase
    .from('prices')
    .update({ service_name, price_value, description })
    .eq('id', id);
  
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

// Törlés
export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  const { error } = await supabase.from('prices').delete().eq('id', id);
  if (error) return new Response(null, { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};