import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sacqanudxgffzdwxtvri.supabase.co";
const supabaseAnonKey = "sb_publishable_3xTq08uSCXmPGU1eEj2zlA_a4MBvxHP";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase as s };
