import { createClient } from '@supabase/supabase-js';

// A PUBLIC_ előtaggal a böngésző (kliens) is látni fogja ezeket
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);