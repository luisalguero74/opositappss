import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // No lanzamos error aquí para no romper el build si falta configuración;
  // simplemente exportamos undefined y las partes que usen Supabase deberán comprobarlo.
  console.warn('[supabase-client] Falta configurar SUPABASE_URL o SUPABASE_ANON_KEY en .env')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : undefined
