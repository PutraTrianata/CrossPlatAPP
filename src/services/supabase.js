import { createClient } from '@supabase/supabase-js';

// Silakan isi dengan URL dan Anon Key dari dashboard Supabase Anda
const supabaseUrl = 'https://uwmpqgsimafupacqvskh.supabase.co';
const supabaseKey = 'sb_publishable_XHWJLR_GKjZXiVd205qcLQ_xz_JUtY1';

export const supabase = createClient(supabaseUrl, supabaseKey);
