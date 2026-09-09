import { z } from "zod";
import type { MarketingPlanContent } from "@/lib/marketing-plan";
import {
  marketingPlanSchema,
  PLAN_SECTION_LABELS,
  parseMarketingPlan,
} from "@/lib/marketing-plan-schema";

const labels: Record<string, string> = {
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
  const base = schema instanceof z.ZodDefault ? schema.removeDefault() : schema;
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
            onClick={() =>
              onChange([
                ...items,
                base.element instanceof z.ZodString ? "" : base.element.parse(undefined),
              ])
            }
          >
            Adicionar item
          </button>
        )}
      </div>
    );
  }
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
        Confirmo que as contagens são verificadas, do mesmo período e população
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
