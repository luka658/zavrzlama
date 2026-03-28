import type { SupabaseClient } from "@supabase/supabase-js";

/** Usklađeno s `public.is_service_or_admin()` u bazi (JWT admin ili service_accounts). */
export async function isServiceOrAdmin(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_service_or_admin");
  if (error) return false;
  return data === true;
}
