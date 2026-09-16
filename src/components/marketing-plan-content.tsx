import { z } from "zod";
import type { MarketingPlanContent } from "@/lib/marketing-plan";
import {
  marketingPlanSchema,
  PLAN_SECTION_LABELS,
  parseMarketingPlan,
} from "@/lib/marketing-plan-schema";

const labels: Record<string, string> = {
  instructionVersion: "Versão das regras",
  validationVersion: "Versão das verificações",
  sourceFingerprint: "Identificação das fontes",
  scopeId: "Escopo de origem",
  scopeVersion: "Versão do escopo",
  sources: "Fontes",
  kind: "Classificação",
  reference: "Referência",
  date: "Data",
  value: "Informação",
  issues: "Pendências",
  priority: "Impacto na decisão",
  question: "Pergunta necessária",
  resolution: "Decisão registrada",
  sourceIds: "Referências",
  actionIds: "Ações afetadas",
  strategy: "Estratégia fundamentada",
  businessResult: "Resultado de negócio",
  audience: "Público prioritário",
  buyingRoles: "Participantes da compra",
  offer: "Oferta prioritária",
  bottleneck: "Gargalo",
  evidenceIds: "IDs das evidências",
  change: "Mudança necessária",
  evaluation: "Como avaliar",
  actions: "Condições das ações",
  actionId: "ID da ação",
  title: "Título",
  problem: "Problema",
  causalStatus: "Causa comprovada ou provável",
  alternatives: "Explicações alternativas",
  deliverable: "Entrega concreta",
  owner: "Responsável",
  prerequisites: "IDs dos pré-requisitos",
  startCondition: "Condição de início",
  startDate: "Data de início",
  endDate: "Data final",
  relativeWindow: "Prazo relativo",
  resources: "Recursos necessários",
  cost: "Custo conhecido",
  scopeItemId: "ID do item contratado",
  scopeClass: "Enquadramento no escopo",
  quantity: "Quantidade",
  unit: "Unidade",
  period: "Período",
  metricId: "ID do indicador",
  completion: "Critério de conclusão",
  release: "Condição de execução",
  indicators: "Indicadores",
  definition: "Definição",
  population: "População ou oportunidades",
  current: "Valor atual",
  target: "Meta",
  justification: "Justificativa",
  salesCycleDays: "Ciclo comercial em dias",
  evaluationDays: "Período de avaliação em dias",
  claims: "Afirmações sensíveis",
  consultationDate: "Data da consulta",
  scenarios: "Cenários",
  illustrative: "Cenário ilustrativo",
  investment: "Investimento",
  contacts: "Contatos",
  qualified: "Oportunidades qualificadas",
  proposals: "Propostas",
  contracts: "Contratos",
  monthlyTicket: "Ticket mensal",
  monthlyRevenue: "Receita mensal",
  capacity: "Capacidade disponível",
  checks: "Verificações automáticas",
  changeLog: "Histórico de alterações",
  descricao: "Descrição",
  hipotese: "Hipótese",
  acao: "Ação",
  decisao: "Decisão",
  diagnostico: "Diagnóstico",
  evidencias: "Evidências",
  evidencia: "Evidência",
  estrategia: "Estratégia",
  responsavel: "Responsável",
  observacao: "Observação",
  recomendacao: "Recomendação",
  titulo: "Título",
  urgencia: "Urgência",
  esforco: "Esforço",
  kpi: "KPI",
};
function label(key: string) {
  return labels[key] ?? key.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
}

export function MarketingPlanContentView({
  content,
  onChange,
}: {
  content: MarketingPlanContent;
  onChange?: ((value: MarketingPlanContent) => void) | undefined;
}) {
  return (
    <div className="space-y-4">
      {(Object.keys(PLAN_SECTION_LABELS) as (keyof MarketingPlanContent)[]).map((key) => (
        <details key={key} className="surface-card p-5" open={key === "resumo_estrategico"}>
          <summary className="cursor-pointer text-lg font-bold">{PLAN_SECTION_LABELS[key]}</summary>
          <div className="mt-4">
            <Field
              schema={marketingPlanSchema.removeDefault().shape[key]}
              value={content[key]}
              name={PLAN_SECTION_LABELS[key]}
              onChange={
                onChange
                  ? (value) => onChange(parseMarketingPlan({ ...content, [key]: value }))
                  : undefined
              }
            />
          </div>
        </details>
      ))}
    </div>
  );
}

function Field({
  schema,
  value,
  name,
  onChange,
}: {
  schema: z.ZodTypeAny;
  value: unknown;
  name: string;
  onChange?: ((value: unknown) => void) | undefined;
}) {
  let base = schema;
  while (base instanceof z.ZodDefault || base instanceof z.ZodOptional)
    base = base instanceof z.ZodDefault ? base.removeDefault() : base.unwrap();
  if (base instanceof z.ZodObject) {
    const record = (value ?? {}) as Record<string, unknown>;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(base.shape as Record<string, z.ZodTypeAny>).map(([key, child]) => (
          <div key={key}>
            <p className="mb-1.5 text-sm font-medium">{label(key)}</p>
            <Field
              schema={child}
              value={record[key]}
              name={`${name}: ${label(key)}`}
              onChange={onChange ? (next) => onChange({ ...record, [key]: next }) : undefined}
            />
          </div>
        ))}
      </div>
    );
  }
  if (base instanceof z.ZodArray) {
    const items = (value ?? []) as unknown[];
    return (
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item informado.</p>
        )}
        {items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border p-3">
            <Field
              schema={base.element}
              value={item}
              name={`${name} ${index + 1}`}
              onChange={
                onChange
                  ? (next) => onChange(items.map((old, i) => (i === index ? next : old)))
                  : undefined
              }
            />
            {onChange && (
              <button
                type="button"
                className="btn-ghost text-destructive"
                aria-label={`Remover ${name} ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                Remover item
              </button>
            )}
          </div>
        ))}
        {onChange && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onChange([...items, emptyField(base.element)])}
          >
            Adicionar item
          </button>
        )}
      </div>
    );
  }
  if (base instanceof z.ZodEnum && onChange)
    return (
      <select
        aria-label={name}
        className="input-base"
        value={String(value ?? base.options[0])}
        onChange={(e) => onChange(e.target.value)}
      >
        {base.options.map((option: string) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    );
  if (!onChange)
    return (
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
        {value === null || value === undefined || value === "" ? "Não informado" : String(value)}
      </p>
    );
  if (base instanceof z.ZodBoolean)
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={name}
        />
        {name}
      </label>
    );
  const numeric = base instanceof z.ZodNumber || base instanceof z.ZodNullable;
  const numberSchema = base instanceof z.ZodNullable ? base.unwrap() : base;
  const min = numberSchema instanceof z.ZodNumber ? numberSchema.minValue : null;
  const max = numberSchema instanceof z.ZodNumber ? numberSchema.maxValue : null;
  return numeric ? (
    <input
      aria-label={name}
      className="input-base"
      type="number"
      step="any"
      min={min ?? undefined}
      max={max ?? undefined}
      value={value == null ? "" : Number(value)}
      onChange={(event) =>
        onChange(
          event.target.value === ""
            ? base instanceof z.ZodNullable
              ? null
              : 0
            : Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Number(event.target.value))),
        )
      }
    />
  ) : (
    <textarea
      aria-label={name}
      className="input-base"
      rows={3}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function emptyField(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodDefault) return schema.parse(undefined);
  if (schema instanceof z.ZodOptional) return emptyField(schema.unwrap());
  if (schema instanceof z.ZodNullable) return null;
  if (schema instanceof z.ZodObject)
    return Object.fromEntries(
      Object.entries(schema.shape as Record<string, z.ZodTypeAny>).map(([k, v]) => [
        k,
        emptyField(v),
      ]),
    );
  if (schema instanceof z.ZodArray) return [];
  if (schema instanceof z.ZodEnum) return schema.options[0];
  if (schema instanceof z.ZodBoolean) return false;
  if (schema instanceof z.ZodNumber) return 0;
  return "";
}
