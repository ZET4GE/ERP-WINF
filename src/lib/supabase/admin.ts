import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service role: ignora RLS. Uso exclusivo del cron (`/api/cron/monthly`),
// que corre sin sesión de usuario y por lo tanto no puede pasar el check `is_staff()`
// del cliente cookie-based de `@/lib/supabase/server`.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
