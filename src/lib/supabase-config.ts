/** Resolve server credentials without mixing the app database with a marketplace integration. */
export function resolveAdminConfig(env: Record<string, string | undefined>) {
  const url = (env["VITE_SUPABASE_URL"] || env["SUPABASE_URL"])?.trim().replace(/\/$/, "");
  const dedicatedKey = env["SYNA_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  const key = dedicatedKey || env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  const integrationUrl = env["SUPABASE_URL"]?.trim().replace(/\/$/, "");
  const error = () =>
    new Error(
      "Conexão administrativa indisponível. Configure SYNA_SUPABASE_SERVICE_ROLE_KEY com a chave de serviço do mesmo projeto de VITE_SUPABASE_URL e publique novamente.",
    );
  if (!url || !key) throw error();
  // Opaque keys cannot reveal their project: only accept the generic key if its URL matches.
  if (!dedicatedKey && integrationUrl && integrationUrl !== url) throw error();
  if (key.startsWith("sb_publishable_")) throw error();
  if (!key.startsWith("sb_secret_")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString());
      const ref = new URL(url).hostname.split(".")[0];
      if (payload.role !== "service_role" || (payload.ref && payload.ref !== ref)) throw error();
    } catch {
      throw error();
    }
  }
  return { url, key };
}
