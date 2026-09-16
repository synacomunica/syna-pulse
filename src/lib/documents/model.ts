import type { Tables } from "@/integrations/supabase/types";
import { PLAN_SECTION_LABELS, parseMarketingPlan } from "../marketing-plan-schema";
import { PLAN_STATUS_LABEL } from "../marketing-plan";
import {
  PILLAR_LABEL,
  DIAGNOSTIC_STATUS_LABEL,
  ACTION_STATUS_LABEL,
  PRIORITY_LABEL,
  FOUR_PS,
} from "../pillars";

export type Block =
  | { kind: "heading"; text: string; level: 1 | 2 | 3 }
  | { kind: "text"; text: string; label?: string }
  | {
      kind: "chart";
      title: string;
      source: string;
      values: { label: string; value: number | null }[];
    };
export type BusinessDocument = {
  title: string;
  client: string;
  city: string;
  reference: string;
  status: string;
  issuedAt: string;
  updatedAt: string;
  abstract: string;
  blocks: Block[];
};
export const dateText = (value: string | null | undefined) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "Não informado";
const vocabulary: Record<string, string> = {
  ...PILLAR_LABEL,
  ...PRIORITY_LABEL,
  ...ACTION_STATUS_LABEL,
  aware: "Aware — Assimilação",
  appeal: "Appeal — Atração",
  ask: "Ask — Arguição",
  act: "Act — Ação",
  advocate: "Advocate — Apologia",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
  critica: "Crítica",
};
const labels: Record<string, string> = {
  ...PLAN_SECTION_LABELS,
  descricao: "Descrição",
  diagnostico: "Diagnóstico",
  evidencias: "Evidências",
  evidencia: "Evidência",
  estrategia: "Estratégia",
  justificativa: "Justificativa",
  responsavel: "Responsável",
  titulo: "Título",
  observacao: "Observação",
  recomendacao: "Recomendação",
  subdimensao: "Subdimensão",
  causa_hipotese: "Hipótese de causa",
  acao: "Ação",
  acoes: "Ações",
  hipotese: "Hipótese",
  decisao: "Decisão",
  kpi: "Indicador de desempenho",
  kpis: "Indicadores de desempenho",
  valor_atual: "Valor atual",
  etapa: "Etapa da jornada",
  nota: "Nota",
  gargalo_pilar: "Pilar do gargalo",
  estado_atual: "Estado atual",
  estado_desejado: "Estado desejado",
  mensagem_central: "Mensagem central",
  populacao: "População",
  periodo: "Período",
  urgencia: "Urgência",
  esforco: "Esforço",
  verificado: "Dados verificados",
  par: "PAR",
  bar: "BAR",
};
const label = (key: string) =>
  labels[key] ?? key.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
function valueText(value: unknown, key = ""): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (typeof value === "string" && /^(prazo|data)$/.test(key) && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return dateText(value);
  return /^(pilar|gargalo_pilar|etapa|prioridade|impacto|urgencia|esforco|status)$/.test(key)
    ? (vocabulary[String(value)] ?? String(value))
    : String(value);
}
function fields(value: unknown): Block[] {
  if (value === null || typeof value !== "object")
    return [{ kind: "text", text: valueText(value) }];
  if (Array.isArray(value)) {
    if (!value.length) return [{ kind: "text", text: "Nenhum item registrado." }];
    return value.flatMap((item, index): Block[] =>
      typeof item === "object" && item !== null
        ? [
            {
              kind: "heading",
              level: 3,
              text: String(
                item.titulo ||
                  item.canal ||
                  item.nome ||
                  item.fase ||
                  item.periodo ||
                  `Item ${index + 1}`,
              ),
            },
            ...fields(item),
          ]
        : [{ kind: "text", text: `${index + 1}. ${valueText(item)}` }],
    );
  }
  return Object.entries(value).flatMap(([key, item]): Block[] =>
    Array.isArray(item)
      ? [
          { kind: "text", label: label(key), text: item.length ? "" : "Nenhum item registrado." },
          ...item.flatMap((entry): Block[] => [{ kind: "text", text: `• ${valueText(entry)}` }]),
        ]
      : [{ kind: "text", label: label(key), text: valueText(item, key) }],
  );
}
export function validScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10
    ? value
    : null;
}
export function overallScore(
  scores: Pick<Tables<"pillar_scores">, "pillar" | "final_score" | "auto_score">[],
) {
  const values = FOUR_PS.map((p) => {
    const row = scores.find((s) => s.pillar === p);
    return validScore(row?.final_score ?? row?.auto_score);
  });
  return values.every((v): v is number => v !== null)
    ? values.reduce((a, b) => a + b, 0) / 4
    : null;
}
export function marketingDocument(
  plan: Tables<"marketing_plans">,
  client: Pick<Tables<"clients">, "company_name" | "city">,
  diagnosticTitle: string,
  issuedAt = new Date().toISOString(),
): BusinessDocument {
  const content = parseMarketingPlan(plan.content);
  const blocks: Block[] = [
    { kind: "heading", level: 1, text: "1 Introdução" },
    {
      kind: "text",
      text: "Este plano reúne o diagnóstico de partida, as escolhas estratégicas, os canais, as ações e os indicadores para orientar a execução do marketing.",
    },
    { kind: "text", label: "Diagnóstico de origem", text: diagnosticTitle || "Não informado" },
    { kind: "text", label: "Situação", text: PLAN_STATUS_LABEL[plan.status] ?? plan.status },
  ];
  if (plan.approved_at)
    blocks.push({ kind: "text", label: "Aprovação", text: dateText(plan.approved_at) });
  if (plan.ai_warning) blocks.push({ kind: "text", label: "Aviso da IA", text: plan.ai_warning });
  const groups: [string, (keyof typeof content)[]][] = [
    [
      "2 Síntese e diagnóstico",
      [
        "resumo_estrategico",
        "notas_4p",
        "diagnostico_partida",
        "subdimensoes",
        "jornada_5a",
        "gargalo_jornada",
        "relacao_4p_5a",
      ],
    ],
    [
      "3 Direcionamento estratégico",
      [
        "publico_estrategico",
        "mudanca_comportamento",
        "objetivo_principal",
        "objetivos_secundarios",
        "estrategia_central",
        "estrategias_5a",
        "quatro_cs",
      ],
    ],
    [
      "4 Canais e comunicação",
      ["canais", "conteudo_comunicacao", "aquisicao", "conversao", "retencao_advocacia"],
    ],
    ["5 Execução e cronograma", ["acoes", "cronograma", "plano_90_dias"]],
    ["6 Indicadores e acompanhamento", ["kpis", "funil", "funil_contexto", "par_bar"]],
    ["7 Riscos e próximos passos", ["riscos", "alertas", "dados_insuficientes", "aprendizados"]],
  ];
  for (const [title, keys] of groups) {
    blocks.push({ kind: "heading", level: 1, text: title });
    keys.forEach((key, i) => {
      blocks.push({
        kind: "heading",
        level: 2,
        text: `${title[0]}.${i + 1} ${PLAN_SECTION_LABELS[key]}`,
      });
      if (key === "notas_4p" || key === "jornada_5a") {
        const values =
          key === "notas_4p"
            ? content.notas_4p.map((s) => ({
                label: valueText(s.pilar, "pilar"),
                value: validScore(s.nota),
              }))
            : content.jornada_5a.map((s) => ({
                label: valueText(s.etapa, "etapa"),
                value: validScore(s.nota),
              }));
        if (values.some((v) => v.value !== null))
          blocks.push({
            kind: "chart",
            title: key === "notas_4p" ? "Notas dos quatro Ps" : "Avaliação da jornada do cliente",
            source: `Syna, plano de marketing, versão ${plan.version}, atualizado em ${dateText(plan.updated_at)}.`,
            values,
          });
      }
      blocks.push(...fields(content[key]));
    });
  }
  blocks.push(
    { kind: "heading", level: 1, text: "8 Fontes e identificação" },
    {
      kind: "text",
      text: `SYNA. ${diagnosticTitle || "Diagnóstico estratégico"}: ${client.company_name}. Registro interno do sistema.`,
    },
    {
      kind: "text",
      text: `SYNA. Plano de marketing de ${client.company_name}. Versão ${plan.version}. Atualizado em ${dateText(plan.updated_at)}. Registro interno ${plan.id}.`,
    },
  );
  return {
    title: "Plano de marketing",
    client: client.company_name,
    city: client.city ?? "",
    reference: `Versão ${plan.version}`,
    status: PLAN_STATUS_LABEL[plan.status] ?? plan.status,
    issuedAt,
    updatedAt: plan.updated_at,
    abstract:
      "Plano estratégico com diagnóstico, objetivos, canais, ações, cronograma e indicadores para orientar a execução e a revisão do marketing da organização. As propostas e os avisos de revisão são mantidos conforme a versão identificada neste documento.",
    blocks,
  };
}
export function reportDocument(
  diagnostic: Tables<"diagnostics">,
  client: Pick<Tables<"clients">, "company_name" | "city">,
  scores: Tables<"pillar_scores">[],
  actions: Tables<"action_items">[],
  issuedAt = new Date().toISOString(),
): BusinessDocument {
  const blocks: Block[] = [
    { kind: "heading", level: 1, text: "1 Introdução" },
    {
      kind: "text",
      text: "Este relatório consolida a análise do diagnóstico selecionado, as notas dos pilares e as ações vinculadas, para apoiar a definição de prioridades com o cliente.",
    },
    {
      kind: "text",
      label: "Diagnóstico",
      text: diagnostic.title || dateText(diagnostic.created_at),
    },
    {
      kind: "text",
      label: "Situação",
      text: DIAGNOSTIC_STATUS_LABEL[diagnostic.status] ?? diagnostic.status,
    },
    { kind: "heading", level: 1, text: "2 Resumo executivo" },
    { kind: "text", text: diagnostic.executive_summary || "Análise ainda não gerada." },
    {
      kind: "text",
      label: "Principal gargalo",
      text: valueText(diagnostic.main_bottleneck, "pilar"),
    },
    {
      kind: "text",
      label: "Principal oportunidade",
      text: diagnostic.main_opportunity || "Não informada.",
    },
    { kind: "heading", level: 1, text: "3 Avaliação dos pilares" },
    {
      kind: "text",
      label: "Nota geral dos quatro Ps",
      text:
        overallScore(scores) === null
          ? "Dados insuficientes para calcular a média dos quatro pilares."
          : `${overallScore(scores)?.toFixed(2).replace(".", ",")} de 10`,
    },
    {
      kind: "text",
      text: "As notas finais revisadas têm precedência sobre as notas automáticas. A média geral exige uma nota válida em cada um dos quatro Ps; Performance é apresentada separadamente.",
    },
  ];
  const values = scores.map((s) => ({
    label: valueText(s.pillar, "pilar"),
    value: validScore(s.final_score ?? s.auto_score),
  }));
  if (values.some((v) => v.value !== null))
    blocks.push({
      kind: "chart",
      title: "Notas do diagnóstico por pilar",
      source: `Syna, ${diagnostic.title || "diagnóstico"}, atualizado em ${dateText(diagnostic.updated_at)}.`,
      values,
    });
  scores.forEach((s, i) => {
    blocks.push(
      { kind: "heading", level: 2, text: `3.${i + 1} ${valueText(s.pillar, "pilar")}` },
      {
        kind: "text",
        label: "Nota utilizada",
        text: valueText(validScore(s.final_score ?? s.auto_score)),
      },
      {
        kind: "text",
        label: "Origem da nota",
        text:
          s.final_score !== null
            ? "Revisão da equipe"
            : s.auto_score !== null
              ? "Cálculo automático"
              : "Não informada",
      },
      { kind: "text", label: "Prioridade", text: valueText(s.priority, "prioridade") },
      { kind: "text", text: s.summary || "Sem análise registrada." },
    );
    for (const [key, title] of [
      ["strengths", "Pontos fortes"],
      ["problems", "Problemas"],
      ["risks", "Riscos"],
      ["opportunities", "Oportunidades"],
    ] as const)
      blocks.push({ kind: "text", label: title, text: "" }, ...fields(s[key]));
  });
  if (!scores.length)
    blocks.push({ kind: "text", text: "Nenhuma avaliação registrada para este diagnóstico." });
  blocks.push({ kind: "heading", level: 1, text: "4 Plano de ação" });
  actions.forEach((a, i) =>
    blocks.push(
      { kind: "heading", level: 2, text: `4.${i + 1} ${a.title}` },
      ...fields({
        descricao: a.description,
        pilar: a.pillar,
        responsavel: a.owner_name,
        prazo: a.due_date,
        prioridade: a.priority,
        status: a.status,
        resultado_esperado: a.expected_result,
      }),
    ),
  );
  if (!actions.length)
    blocks.push({ kind: "text", text: "Nenhuma ação vinculada a este diagnóstico." });
  blocks.push(
    { kind: "heading", level: 1, text: "5 Considerações finais" },
    {
      kind: "text",
      text: diagnostic.main_opportunity
        ? `A oportunidade registrada para orientar os próximos passos é: ${diagnostic.main_opportunity}`
        : "O diagnóstico ainda não possui uma oportunidade principal registrada. Complete a análise antes de definir as prioridades finais.",
    },
    { kind: "heading", level: 1, text: "6 Fontes e identificação" },
    {
      kind: "text",
      text: `SYNA. ${diagnostic.title || "Diagnóstico estratégico"}: ${client.company_name}. Atualizado em ${dateText(diagnostic.updated_at)}. Registro interno ${diagnostic.id}.`,
    },
    {
      kind: "text",
      text: "Notas e ações: registros vinculados ao diagnóstico no sistema Syna, consultados na data de emissão.",
    },
  );
  return {
    title: "Relatório de diagnóstico estratégico",
    client: client.company_name,
    city: client.city ?? "",
    reference: diagnostic.title || "Diagnóstico estratégico",
    status: DIAGNOSTIC_STATUS_LABEL[diagnostic.status] ?? diagnostic.status,
    issuedAt,
    updatedAt: diagnostic.updated_at,
    abstract:
      "Relatório de análise dos quatro Ps do marketing e da Performance, com síntese executiva, pontos fortes, problemas, riscos, oportunidades e plano de ação vinculado ao diagnóstico. Destina-se à revisão das prioridades e à apresentação dos resultados ao cliente.",
    blocks,
  };
}
export function chartSvg(values: { label: string; value: number | null }[]): string {
  const esc = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const height = 70 + values.length * 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}"><rect width="760" height="${height}" fill="white"/>${[0, 2, 4, 6, 8, 10].map((n) => `<text x="${260 + n * 40}" y="24" font-family="Arial" font-size="14" text-anchor="middle" fill="#444">${n}</text><line x1="${260 + n * 40}" y1="32" x2="${260 + n * 40}" y2="${height - 20}" stroke="#ddd"/>`).join("")}${values.map((v, i) => `<text x="8" y="${61 + i * 52}" font-family="Arial" font-size="16" fill="#111">${esc(v.label)}</text>${v.value === null ? "" : `<rect x="260" y="${40 + i * 52}" width="${v.value * 40}" height="30" fill="#3b5868"/>`}<text x="680" y="${61 + i * 52}" font-family="Arial" font-size="16" fill="#111">${v.value === null ? "N/D" : v.value.toFixed(1).replace(".", ",")}</text>`).join("")}</svg>`;
}
