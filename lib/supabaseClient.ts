// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Em apps Expo/React Native, o @supabase/supabase-js já usa fetch nativo.
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,          // mantém sessão após fechar app
    autoRefreshToken: true,        // renova tokens automaticamente
    flowType: 'pkce',              // seguro para mobile
  },
});
