import { z } from "zod";
const amount = z.number().finite().min(0).max(1e12).nullable().default(null);
const rate = z.number().finite().min(0).max(100).nullable().default(null);
export const scenarioSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  revenue: amount,
  target: amount,
  ticket: amount,
  currentSales: amount,
  extraCapacity: amount,
  budget: amount,
  expectedCac: amount,
  margin: rate,
  acquisitionShare: rate,
  clickRate: rate,
  leadRate: rate,
  saleRate: rate,
  usesMeetings: z.boolean().default(false),
  meetingRate: rate,
  basis: z.enum(["hipotese", "historico", "referencia"]).default("hipotese"),
  source: z.string().trim().max(4000).default(""),
  bottleneck: z.string().trim().max(4000).default(""),
  hypothesis: z.string().trim().max(4000).default(""),
  success: z.string().trim().max(4000).default(""),
  testShare: rate,
  optimizeShare: rate,
  reviewDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default(""),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export function newScenario(month: string): Scenario {
  return scenarioSchema.parse({ month });
}
export function calculateScenario(s: Scenario) {
  const gap = s.target != null && s.revenue != null ? Math.max(0, s.target - s.revenue) : null;
  const sales =
    gap === 0
      ? 0
      : gap != null && s.ticket != null && s.ticket > 0
        ? Math.ceil(gap / s.ticket)
        : null;
  const reverse = (n: number | null, r: number | null): number | null =>
    n === 0 ? 0 : n != null && r != null && r > 0 ? Math.ceil(n / (r / 100)) : null;
  const meetings = s.usesMeetings ? reverse(sales, s.saleRate) : null;
  const leads = s.usesMeetings ? reverse(meetings, s.meetingRate) : reverse(sales, s.saleRate);
  const clicks = reverse(leads, s.leadRate);
  const reach = reverse(clicks, s.clickRate);
  const cacLimit =
    s.ticket != null && s.margin != null && s.acquisitionShare != null
      ? (((s.ticket * s.margin) / 100) * s.acquisitionShare) / 100
      : null;
  const neededBudget =
    sales === 0
      ? 0
      : sales != null && s.expectedCac != null && s.expectedCac > 0
        ? sales * s.expectedCac
        : null;
  const budgetSales =
    s.budget === 0
      ? 0
      : s.budget != null && s.expectedCac != null && s.expectedCac > 0
        ? Math.floor(s.budget / s.expectedCac)
        : null;
  const feasibleSales =
    budgetSales == null
      ? null
      : s.extraCapacity == null
        ? budgetSales
        : Math.min(budgetSales, Math.floor(s.extraCapacity));
  const warnings: string[] = [];
  if (sales != null && s.extraCapacity != null && sales > s.extraCapacity)
    warnings.push("A meta exige mais vendas adicionais do que a capacidade informada.");
  if (neededBudget != null && s.budget != null && neededBudget > s.budget)
    warnings.push("O orçamento não cobre a meta com o custo por aquisição estimado.");
  if (cacLimit != null && s.expectedCac != null && s.expectedCac > cacLimit)
    warnings.push("O custo estimado por aquisição supera o limite calculado pela margem.");
  if (
    s.currentSales != null &&
    s.ticket != null &&
    s.revenue != null &&
    Math.abs(s.currentSales * s.ticket - s.revenue) > Math.max(1, s.revenue * 0.05)
  )
    warnings.push(
      "Vendas atuais × ticket diferem do faturamento. Confira recorrência, período e composição da receita.",
    );
  if (
    [s.clickRate, s.leadRate, s.saleRate, ...(s.usesMeetings ? [s.meetingRate] : [])].some(
      (v) => v === 0,
    ) &&
    gap !== 0
  )
    warnings.push("Uma taxa zero impede calcular o funil reverso dessa etapa.");
  return {
    gap,
    sales,
    meetings,
    leads,
    clicks,
    reach,
    cacLimit,
    neededBudget,
    budgetSales,
    feasibleSales,
    warnings,
    projectedRevenue:
      feasibleSales != null && s.ticket != null && s.revenue != null
        ? s.revenue + feasibleSales * s.ticket
        : null,
    testBudget: s.budget != null && s.testShare != null ? (s.budget * s.testShare) / 100 : null,
    optimizeBudget:
      s.budget != null && s.optimizeShare != null ? (s.budget * s.optimizeShare) / 100 : null,
  };
}
// Only numeric answers are reused automatically. Free text requires interpretation by the team.
export function diagnosticScenario(answers: { question_key: string; value: unknown }[]) {
  const keys: Record<string, keyof Scenario> = {
    "performance.faturamento_atual": "revenue",
    "performance.faturamento_meta": "target",
    "preco.ticket": "ticket",
    "performance.investimento": "budget",
  };
  const values: Partial<Scenario> = {};
  for (const a of answers) {
    const key = keys[a.question_key];
    const n =
      typeof a.value === "number"
        ? a.value
        : typeof a.value === "string" && /^\d+(\.\d+)?$/.test(a.value)
          ? Number(a.value)
          : null;
    if (key && n != null && Number.isFinite(n) && n >= 0 && n <= 1e12)
      Object.assign(values, { [key]: n });
  }
  return values;
}
