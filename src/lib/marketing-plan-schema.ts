import { z } from "zod";
import type { MarketingPlanContent } from "./marketing-plan";

const text = z.string().default("");
const number = z.number().finite().nullable().default(null);
const texts = z.array(z.string()).default([]);
const object = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).default(() => z.object(shape).parse({}));
const list = <T extends z.ZodTypeAny>(item: T) => z.array(item).default([]);
const objective = object({
  descricao: text,
  problema: text,
  pilar: text,
  etapa: text,
  kpi: text,
  valor_atual: number,
  meta: number,
  prazo: text,
});
export const marketingPlanSchema = object({
  resumo_estrategico: text,
  notas_4p: list(object({ pilar: text, nota: z.number().min(0).max(10).nullable().default(null) })),
  canais: list(
    object({ canal: text, objetivo: text, estrategia: text, etapa: text, justificativa: text }),
  ),
  conteudo_comunicacao: object({ mensagem_central: text, temas: texts, provas: texts }),
  aquisicao: text,
  conversao: text,
  retencao_advocacia: text,
  publico_estrategico: text,
  diagnostico_partida: object({
    gargalo_pilar: text,
    subdimensao: text,
    problema: text,
    causa: text,
    oportunidade: text,
    evidencias: texts,
  }),
  subdimensoes: list(
    object({
      pilar: text,
      nome: text,
      nota: z.number().finite().min(0).max(10).nullable().default(null),
      problema: text,
      evidencia: text,
      oportunidade: text,
    }),
  ),
  jornada_5a: list(
    object({
      etapa: text,
      nota: z.number().finite().min(0).max(10).nullable().default(null),
      diagnostico: text,
      problemas: texts,
      evidencias: texts,
    }),
  ),
  gargalo_jornada: object({
    etapa: text,
    diagnostico: text,
    evidencias: texts,
    causa_hipotese: text,
  }),
  relacao_4p_5a: object({
    pilar: text,
    subdimensao: text,
    etapa: text,
    problema: text,
    causa: text,
  }),
  mudanca_comportamento: object({ estado_atual: text, estado_desejado: text }),
  objetivo_principal: objective,
  objetivos_secundarios: list(objective),
  estrategia_central: text,
  estrategias_5a: list(object({ etapa: text, estrategia: text, justificativa: text })),
  quatro_cs: list(object({ de: text, para: text, oportunidades: texts })),
  acoes: list(
    object({
      titulo: text,
      descricao: text,
      categoria: text,
      objetivo: text,
      estrategia: text,
      pilar: text,
      etapa: text,
      responsavel: text,
      prazo: text,
      kpi: text,
      meta: text,
      impacto: text,
      urgencia: text,
      esforco: text,
      prioridade: text,
      fase: text,
    }),
  ),
  kpis: list(object({ etapa: text, nome: text, valor_atual: number, meta: number })),
  cronograma: list(object({ periodo: text, foco: text, acoes: texts })),
  plano_90_dias: list(object({ fase: text, objetivo: text, acoes: texts })),
  funil: list(object({ etapa: text, valor: number })),
  funil_contexto: object({
    periodo: text,
    populacao: text,
    verificado: z.boolean().default(false),
  }),
  par_bar: object({ par: number, bar: number, observacao: text }),
  riscos: texts,
  alertas: list(object({ titulo: text, motivo: text, recomendacao: text })),
  dados_insuficientes: texts,
  aprendizados: list(
    object({ hipotese: text, acao: text, resultado: text, aprendizado: text, decisao: text }),
  ),
});

export function parseMarketingPlan(value: unknown): MarketingPlanContent {
  return marketingPlanSchema.parse(value);
}

export const PLAN_SECTION_LABELS: Record<keyof MarketingPlanContent, string> = {
  resumo_estrategico: "Resumo estratégico",
  notas_4p: "Notas do diagnóstico 4P",
  canais: "Canais e justificativas estratégicas",
  conteudo_comunicacao: "Conteúdo e comunicação",
  aquisicao: "Aquisição",
  conversao: "Conversão",
  retencao_advocacia: "Retenção e advocacia",
  publico_estrategico: "Público estratégico",
  diagnostico_partida: "Diagnóstico de partida",
  subdimensoes: "Subdimensões",
  jornada_5a: "Jornada 5A",
  gargalo_jornada: "Gargalo da jornada",
  relacao_4p_5a: "Relação 4P e 5A",
  mudanca_comportamento: "Mudança de comportamento",
  objetivo_principal: "Objetivo principal",
  objetivos_secundarios: "Objetivos secundários",
  estrategia_central: "Estratégia central",
  estrategias_5a: "Estratégias 5A",
  quatro_cs: "Quatro Cs",
  acoes: "Ações",
  kpis: "KPIs",
  cronograma: "Cronograma",
  plano_90_dias: "Plano de 90 dias",
  funil: "Funil",
  funil_contexto: "Confiabilidade do funil",
  par_bar: "PAR / BAR",
  riscos: "Riscos",
  alertas: "Alertas",
  dados_insuficientes: "Dados insuficientes",
  aprendizados: "Aprendizados",
};

// JSON Schema mirrors the editor schema so model output uses the same field types.
function aiSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodDefault) return aiSchema(schema.removeDefault());
  if (schema instanceof z.ZodNullable)
    return { anyOf: [aiSchema(schema.unwrap()), { type: "null" }] };
  if (schema instanceof z.ZodObject)
    return {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(schema.shape as Record<string, z.ZodTypeAny>).map(([key, child]) => [
          key,
          aiSchema(child),
        ]),
      ),
      required: Object.keys(schema.shape),
    };
  if (schema instanceof z.ZodArray) return { type: "array", items: aiSchema(schema.element) };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  return { type: "string" };
}
export const marketingPlanAiSchema = aiSchema(marketingPlanSchema);
