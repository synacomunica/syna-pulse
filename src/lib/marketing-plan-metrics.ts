export function journeyStatus(score: number | null) {
  if (score === null) return "Dados insuficientes";
  if (score < 4) return "Crítico";
  if (score < 6) return "Atenção";
  if (score < 8) return "Adequado";
  return "Forte";
}
export function attainment(actual: number | null, target: number | null, inverse = false) {
  if (actual === null || target === null || target <= 0 || actual < 0) return null;
  if (inverse) return actual <= target ? 100 : (target / actual) * 100;
  return (actual / target) * 100;
}
export async function integrationId(planId: string, kind: string, index: number) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${planId}:${kind}:${index}`)),
  );
  bytes[6] = (bytes[6]! & 15) | 80;
  bytes[8] = (bytes[8]! & 63) | 128;
  const s = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export function funnelRatios(
  values: { etapa: string; valor: number | null }[],
  context: { periodo: string; populacao: string; verificado: boolean },
) {
  const get = (stage: string) => values.find((v) => v.etapa === stage)?.valor;
  const aware = get("aware"),
    act = get("act"),
    advocate = get("advocate");
  if (
    !context.verificado ||
    !context.periodo.trim() ||
    !context.populacao.trim() ||
    aware == null ||
    aware <= 0
  )
    return { par: null, bar: null };
  return {
    par: act != null && act >= 0 && act <= aware ? act / aware : null,
    bar: advocate != null && advocate >= 0 && advocate <= aware ? advocate / aware : null,
  };
}
