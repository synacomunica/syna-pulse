/** Display-only formatting: original evidence stays unchanged in storage. */
export function readableValue(raw: string): string {
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    /* Legacy unencoded text. */
  }
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value))
    return value
      .map((v) => readableValue(JSON.stringify(v)))
      .filter(Boolean)
      .join(" · ");
  if (typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => `${k.replaceAll("_", " ")}: ${readableValue(JSON.stringify(v))}`)
      .join("\n");
  return String(value);
}
export function sourceLabel(reference: string, questions: Record<string, string>): string {
  const key = reference.match(/resposta (.+)$/)?.[1];
  if (key) return `Formulário · ${questions[key] || key.split(".").pop()?.replaceAll("_", " ")}`;
  const labels: Record<string, string> = {
    company_name: "Empresa",
    trade_name: "Nome fantasia",
    notes: "Observações",
    segment: "Segmento",
    city: "Cidade",
    updated_at: "Última atualização",
    category: "Categoria",
  };
  if (reference.startsWith("Cadastro: "))
    return `Cadastro · ${labels[reference.slice(10)] || reference.slice(10).replaceAll("_", " ")}`;
  return reference
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
