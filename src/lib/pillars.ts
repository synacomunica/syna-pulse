import type { Pillar } from "./questions";

export const PILLARS: Pillar[] = ["produto", "preco", "praca", "promocao", "performance"];
export const FOUR_PS: Pillar[] = ["produto", "preco", "praca", "promocao"];

export const PILLAR_LABEL: Record<Pillar, string> = {
  produto: "Produto",
  preco: "Preço",
  praca: "Praça",
  promocao: "Promoção",
  performance: "Performance",
};

export type ScoreStatus = "critico" | "atencao" | "adequado" | "forte";

export const STATUS_LABEL: Record<ScoreStatus, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  adequado: "Adequado",
  forte: "Forte",
};

export function scoreStatus(score: number | null | undefined): ScoreStatus {
  const n = Number(score ?? 0);
  if (n <= 3) return "critico";
  if (n <= 5) return "atencao";
  if (n <= 7) return "adequado";
  return "forte";
}

export function statusClasses(status: ScoreStatus): string {
  switch (status) {
    case "critico":
      return "bg-destructive/10 text-destructive border-destructive/25";
    case "atencao":
      return "bg-warning/15 text-warning border-warning/30";
    case "adequado":
      return "bg-good/12 text-good border-good/30";
    case "forte":
      return "bg-strong/12 text-strong border-strong/30";
  }
}

export const CLIENT_STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  diagnostico_pendente: "Diagnóstico pendente",
  diagnostico_em_analise: "Diagnóstico em análise",
  cliente_ativo: "Cliente ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export const DIAGNOSTIC_STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando cliente",
  em_preenchimento: "Em preenchimento",
  respondido: "Respondido",
  em_analise: "Em análise",
  validado: "Validado",
};

export const PRIORITY_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const ACTION_STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export interface MetricDef {
  key: string;
  label: string;
  format: "currency" | "number" | "percent" | "ratio";
  /** true quando valores menores são melhores (ex.: CAC) */
  inverse?: boolean;
}

export const METRICS: MetricDef[] = [
  { key: "faturamento", label: "Faturamento", format: "currency" },
  { key: "leads", label: "Leads", format: "number" },
  { key: "clientes", label: "Clientes conquistados", format: "number" },
  { key: "ticket_medio", label: "Ticket médio", format: "currency" },
  { key: "investimento", label: "Investimento em marketing", format: "currency" },
  { key: "cac", label: "CAC", format: "currency", inverse: true },
  { key: "roas", label: "ROAS", format: "ratio" },
  { key: "roi", label: "ROI", format: "percent" },
  { key: "conversao", label: "Taxa de conversão", format: "percent" },
  { key: "visitas", label: "Visitas", format: "number" },
  { key: "oportunidades", label: "Oportunidades", format: "number" },
];

export function metricDef(key: string): MetricDef {
  return METRICS.find((m) => m.key === key) ?? { key, label: key, format: "number" };
}
