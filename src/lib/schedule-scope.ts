import { type ScopeSnapshot, type Governance, validDate, elapsedDays } from "./planning-policy";
export function checkScheduleScope(
  items: { data: string; canal: string; formato: string; scopeItemId?: string | undefined }[],
  scope: ScopeSnapshot | null,
  g?: Governance,
) {
  const issues: string[] = [];
  if (!scope || scope.status !== "confirmado")
    return [
      "Proposta sem conferência contratual: quantidades, custos e responsabilidades dependem de confirmação.",
    ];
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!validDate(item.data)) throw new Error("Data inválida no cronograma.");
    const candidates = scope.content.items.filter(
      (s) =>
        s.formats.includes(item.formato) &&
        (!s.channels.length ||
          s.channels.some((c) => c.toLowerCase() === item.canal.toLowerCase())),
    );
    const matched = item.scopeItemId
      ? candidates.find((s) => s.id === item.scopeItemId)
      : candidates.length === 1
        ? candidates[0]
        : undefined;
    if (candidates.some((s) => s.classification === "excluido"))
      throw new Error(
        `Formato ${item.formato} expressamente excluído para ${item.canal}. Combine adicional antes de gerar.`,
      );
    if (
      (scope.content.validFrom && item.data < scope.content.validFrom) ||
      (scope.content.validUntil && item.data > scope.content.validUntil)
    )
      throw new Error("Cronograma fora da vigência do escopo; confirme continuidade.");
    if (item.scopeItemId && !matched)
      throw new Error("A referência de escopo não corresponde ao formato e canal desta entrega.");
    if (!matched || !matched.confirmed || matched.classification !== "incluido") {
      issues.push(`${item.formato}/${item.canal}: enquadramento não confirmado.`);
      continue;
    }
    if (matched.responsibility === "cliente")
      issues.push(`${item.formato}: produção atribuída ao cliente; não é entrega da agência.`);
    if (matched.costType === "honorarios" && matched.amount !== null)
      issues.push(
        "Honorários não incluem automaticamente verba de mídia; confirmar orçamento de veiculação separado.",
      );
    if (matched.counting === "ambiguo")
      throw new Error(
        "Relação entre entregas ambígua. Esclareça a contagem antes de gerar quantidades.",
      );
    if (
      matched.productionDays !== null &&
      matched.approvalDays !== null &&
      elapsedDays(new Date().toISOString().slice(0, 10), item.data, matched.deadlineBasis) <
        matched.productionDays + matched.approvalDays
    )
      throw new Error("Data não comporta os prazos de produção e aprovação.");
    if (matched.productionDays !== null || matched.approvalDays !== null)
      issues.push(
        matched.deadlineBasis === "uteis"
          ? "Prazos úteis excluem fins de semana; confirmar feriados locais e o recebimento dos materiais antes de liberar a data."
          : matched.deadlineBasis === "nao_informado"
            ? "Confirmar se os prazos de produção/aprovação são dias úteis ou corridos."
            : "",
      );
    const consume = (id: string) => {
      const s = scope.content.items.find((x) => x.id === id);
      if (!s) return;
      const period = s.period.toLowerCase();
      const bucket =
        period === "mês" || period === "mes" || period === "mensal"
          ? item.data.slice(0, 7)
          : period === "contrato"
            ? "contrato"
            : null;
      if (!bucket) {
        issues.push(`Período ${s.period} exige conferência manual; limite não calculado.`);
        return;
      }
      const key = id + "|" + bucket;
      totals.set(key, (totals.get(key) ?? 0) + 1);
      if (s.quantity !== null && totals.get(key)! > s.quantity)
        throw new Error(
          `Limite de ${s.quantity} ${s.unit}/${s.period} excedido. Vídeos incluídos no total contam uma única vez nesse total.`,
        );
    };
    consume(matched.id);
    if (matched.counting === "incluido_no_total") {
      if (!matched.parentId) throw new Error("Defina o total que inclui esta entrega.");
      consume(matched.parentId);
    }
  }
  if (g?.claims.some((c) => c.status === "pendente"))
    issues.push("Afirmações sensíveis pendentes no plano: não publicar sem evidência.");
  return [...new Set(issues.filter(Boolean))];
}
