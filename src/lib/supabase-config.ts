/** Resolve server credentials without mixing the app database with a marketplace integration. */
export function resolveAdminConfig(env: Record<string, string | undefined>) {
  const url = (env["VITE_SUPABASE_URL"] || env["SUPABASE_URL"])?.trim().replace(/\/$/, "");
  const dedicatedKey = env["SYNA_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  const key = dedicatedKey || env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  const integrationUrl = env["SUPABASE_URL"]?.trim().replace(/\/$/, "");
  // Messages describe the configuration failure, never the credential value.
  const error = (reason: string) =>
    new Error(
      `Conexão administrativa indisponível. ${reason} Configure SYNA_SUPABASE_SERVICE_ROLE_KEY com a chave de serviço do mesmo projeto de VITE_SUPABASE_URL e publique novamente.`,
    );
  if (!url) throw error("URL do banco não configurada no servidor.");
  if (!key) throw error("Chave de serviço ausente no servidor.");
  if (!dedicatedKey && integrationUrl && integrationUrl !== url)
    throw error("Chave dedicada ausente; a integração genérica pertence a outro banco.");
  if (key.startsWith("sb_publishable_"))
    throw error("Foi cadastrada uma chave pública (publishable), não uma chave de serviço.");
  if (!key.startsWith("sb_secret_")) {
    let payload: { role?: string; ref?: string };
    try {
      payload = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString());
      if (!payload || typeof payload !== "object") throw new Error();
    } catch {
      throw error("O valor cadastrado não está no formato de uma chave Supabase.");
    }
    if (payload.role !== "service_role")
      throw error("A chave cadastrada não tem o papel service_role.");
    const ref = new URL(url).hostname.split(".")[0];
    if (payload.ref && payload.ref !== ref)
      throw error(`A chave pertence a outro projeto. O banco esperado é ${ref}.`);
  }
  return { url, key };
}
