import type { Topic } from "./editorial-workflow";
export function calendarDays(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year!, m! - 1, 1));
  const count = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
  return [
    ...Array(start.getUTCDay()).fill(null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ] as (string | null)[];
}
export function csvCell(value: string) {
  const safe = /^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function scheduleCsv(
  topics: Topic[],
  labels: {
    formats: Record<string, string>;
    purposes: Record<string, string>;
    stages: Record<string, string>;
  },
) {
  const header = [
    "Data",
    "Horário",
    "Tema",
    "Abordagem",
    "Função",
    "Formato",
    "Canal",
    "CTA",
    "Responsável",
    "Prazo produção",
    "Prazo aprovação",
    "Status",
    "Mensagem",
    "Materiais",
    "Roteiro / legenda",
    "Orientação visual",
    "Resultado esperado / hipótese",
  ];
  const rows = topics.map((t) => [
    t.publication,
    t.publicationTime,
    t.theme,
    t.approach,
    labels.purposes[t.purpose] ?? t.purpose,
    labels.formats[t.format] ?? t.format,
    t.channel,
    t.cta,
    t.owner,
    t.productionDue,
    t.approvalDue,
    labels.stages[t.status] ?? t.status,
    t.message,
    t.materials,
    t.copy,
    t.visual,
    t.testHypothesis,
  ]);
  return "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}
