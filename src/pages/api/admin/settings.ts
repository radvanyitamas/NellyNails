import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const PATCH: APIRoute = async ({ request }) => {
  const { pw, contact, hours } = await request.json();

  if (pw !== process.env.ADMIN_PASSWORD) {
    return new Response(null, { status: 401 });
  }

  // Frissítjük a telefonszámot/címet
  await supabase.from('site_settings').update({ value: contact }).eq('key', 'contact');
  
  // Frissítjük a nyitvatartást
  await supabase.from('site_settings').update({ value: hours }).eq('key', 'hours');

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};