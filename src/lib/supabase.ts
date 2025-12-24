import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client (opcional)
 * - Se VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não existirem,
 *   exportamos `supabase = null` e o app segue funcionando sem login.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // NÃO dê throw aqui, senão a página fica branca em produção.
  console.warn("Supabase env vars missing. Auth/assinatura desativados.");
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
