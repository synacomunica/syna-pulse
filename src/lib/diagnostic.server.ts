import { ALL_QUESTIONS, STEPS, pillarOfKey, isVisible } from "./questions";
import type { Pillar, AnswerValue, AnswerMap } from "./questions";
import { FOUR_PS, PILLARS, PILLAR_LABEL } from "./pillars";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface PublicDiagnostic {
  id: string;
  status: string;
  currentStep: number;
  companyName: string;
  answers: AnswerMap;
}

export async function fetchByToken(token: string): Promise<PublicDiagnostic | null> {
  const db = await admin();
  const { data: diag } = await db
    .from("diagnostics")
    .select("id, status, current_step, client_id")
    .eq("token", token)
    .maybeSingle();
  if (!diag) return null;

  const [{ data: client }, { data: rows }] = await Promise.all([
    db.from("clients").select("company_name, trade_name").eq("id", diag.client_id).maybeSingle(),
    db.from("answers").select("question_key, value").eq("diagnostic_id", diag.id),
  ]);

  const answers: AnswerMap = {};
  for (const r of rows ?? []) answers[r.question_key] = r.value as AnswerValue;

  return {
    id: diag.id,
    status: diag.status,
    currentStep: diag.current_step,
    companyName: client?.trade_name || client?.company_name || "sua empresa",
    answers,
  };
}

export async function saveAnswers(
  token: string,
  answers: AnswerMap,
  step: number,
): Promise<{ ok: boolean }> {
  const db = await admin();
  const { data: diag } = await db
    .from("diagnostics")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();
  if (!diag) throw new Error("Link inválido");
  if (diag.status === "respondido" || diag.status === "em_analise" || diag.status === "validado") {
    return { ok: true };
  }

  const valid = new Set(ALL_QUESTIONS.map((q) => q.key));
  const rows = Object.entries(answers)
    .filter(([k]) => valid.has(k))
    .map(([question_key, value]) => ({
      diagnostic_id: diag.id,
      question_key,
      pillar: pillarOfKey(question_key),
      value: (value ?? null) as never,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length) {
    const { error } = await db.from("answers").upsert(rows, {
      onConflict: "diagnostic_id,question_key",
    });
    if (error) throw new Error(error.message);
  }

  await db
    .from("diagnostics")
    .update({ current_step: step, status: "em_preenchimento" })
    .eq("id", diag.id);

  return { ok: true };
}

export async function submitDiagnostic(token: string): Promise<{ ok: boolean; id: string }> {
  const db = await admin();
  const { data: diag } = await db
    .from("diagnostics")
    .select("id, client_id")
    .eq("token", token)
    .maybeSingle();
  if (!diag) throw new Error("Link inválido");

  await db
    .from("diagnostics")
    .update({ status: "respondido", submitted_at: new Date().toISOString() })
    .eq("id", diag.id);
  await db.from("clients").update({ status: "diagnostico_em_analise" }).eq("id", diag.client_id);

  // Dispara a análise automaticamente logo após o envio.
  try {
    await runAnalysis(diag.id);
  } catch (e) {
    console.error("[diagnostic] falha ao analisar automaticamente", e);
  }

  return { ok: true, id: diag.id };
}

/* ------------------------------------------------------------------ */
/*  Análise                                                            */
/* ------------------------------------------------------------------ */

interface PillarResult {
  nota: number;
  resumo: string;
  pontos_fortes: string[];
  problemas: string[];
  riscos: string[];
  oportunidades: string[];
  prioridade: "alta" | "media" | "baixa";
}

type AnalysisResult = Record<Pillar, PillarResult> & {
  resumo_executivo: string;
  principal_oportunidade: string;
};

function answersAsText(answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const step of STEPS) {
    lines.push(`\n## ${step.title}`);
    for (const q of step.questions) {
      if (!isVisible(q, answers)) continue;
      const v = answers[q.key];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
      lines.push(`- ${q.label}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
    }
  }
  return lines.join("\n");
}

/** Heurística de fallback, usada se a IA estiver indisponível. */
function heuristicScore(answers: Record<string, unknown>, pillar: Pillar): number {
  const keys = ALL_QUESTIONS.filter((q) => pillarOfKey(q.key) === pillar);
  if (!keys.length) return 5;
  let filled = 0;
  let depth = 0;
  for (const q of keys) {
    const v = answers[q.key];
    if (v === undefined || v === null || v === "") continue;
    filled++;
    const text = Array.isArray(v) ? v.join(" ") : String(v);
    if (text.length > 60) depth++;
  }
  const coverage = filled / keys.length;
  const richness = depth / keys.length;
  return Math.round(Math.min(10, Math.max(1, coverage * 6 + richness * 4)) * 10) / 10;
}

function fallbackAnalysis(answers: Record<string, unknown>): AnalysisResult {
  const base = {} as AnalysisResult;
  for (const p of PILLARS) {
    base[p] = {
      nota: heuristicScore(answers, p),
      resumo: "Análise automática indisponível no momento. Revise manualmente.",
      pontos_fortes: [],
      problemas: [],
      riscos: [],
      oportunidades: [],
      prioridade: "media",
    };
  }
  base.resumo_executivo =
    "A análise automática não pôde ser concluída. As notas apresentadas são estimativas baseadas na completude das respostas e devem ser revisadas pela equipe Syna.";
  base.principal_oportunidade = "A definir na revisão da equipe.";
  return base;
}

const SYSTEM_PROMPT = `Você é estrategista sênior de marketing da agência Syna.
Analisa diagnósticos de clientes usando a matriz 4P + Performance.
Princípio central: "Não começar pelo canal. Começar pelo negócio."
Você NUNCA altera, inventa ou corrige informações fornecidas pelo cliente — apenas interpreta.
Escreva em português do Brasil, direto, sem jargão vazio e sem elogios genéricos.
Notas de 0 a 10, sendo 0-3 crítico, 4-5 atenção, 6-7 adequado, 8-10 forte.
Seja rigoroso: respostas vagas, ausência de dados e falta de diferenciação reduzem a nota.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...PILLARS, "resumo_executivo", "principal_oportunidade"],
  properties: {
    ...Object.fromEntries(
      PILLARS.map((p) => [
        p,
        {
          type: "object",
          additionalProperties: false,
          required: [
            "nota",
            "resumo",
            "pontos_fortes",
            "problemas",
            "riscos",
            "oportunidades",
            "prioridade",
          ],
          properties: {
            nota: { type: "number" },
            resumo: { type: "string" },
            pontos_fortes: { type: "array", items: { type: "string" } },
            problemas: { type: "array", items: { type: "string" } },
            riscos: { type: "array", items: { type: "string" } },
            oportunidades: { type: "array", items: { type: "string" } },
            prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          },
        },
      ]),
    ),
    resumo_executivo: { type: "string" },
    principal_oportunidade: { type: "string" },
  },
} as const;

async function callAi(
  prompt: string,
): Promise<{ result: AnalysisResult | null; error: string | null }> {
  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  const apiKey = geminiKey || process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { result: null, error: "Chave de IA não configurada." };

  const res = await fetch(
    geminiKey
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: geminiKey
          ? process.env["GEMINI_MODEL"] || "gemini-3.5-flash"
          : "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "diagnostico", strict: true, schema: SCHEMA },
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429)
      return {
        result: null,
        error: "Limite de uso da IA atingido. Tente novamente em alguns minutos.",
      };
    if (res.status === 402)
      return {
        result: null,
        error: "Créditos de IA esgotados. Adicione créditos para gerar a análise.",
      };
    return {
      result: null,
      error: `Falha na análise por IA (${res.status}). ${body.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return { result: null, error: "A IA não retornou conteúdo." };
  try {
    return { result: JSON.parse(content) as AnalysisResult, error: null };
  } catch {
    return { result: null, error: "Resposta da IA em formato inesperado." };
  }
}

export async function runAnalysis(diagnosticId: string) {
  const db = await admin();

  const { data: diag } = await db
    .from("diagnostics")
    .select("id, client_id")
    .eq("id", diagnosticId)
    .maybeSingle();
  if (!diag) throw new Error("Diagnóstico não encontrado");

  const [{ data: client }, { data: rows }] = await Promise.all([
    db
      .from("clients")
      .select("company_name, trade_name, segment, category, city, state")
      .eq("id", diag.client_id)
      .maybeSingle(),
    db.from("answers").select("question_key, value").eq("diagnostic_id", diagnosticId),
  ]);

  const answers: Record<string, unknown> = {};
  for (const r of rows ?? []) answers[r.question_key] = r.value;

  const prompt = `Cliente: ${client?.company_name ?? "—"} (${client?.trade_name ?? "—"})
Segmento: ${client?.segment ?? "não informado"} | Categoria: ${client?.category ?? "não informada"}
Localização: ${client?.city ?? "—"}/${client?.state ?? "—"}

Respostas do formulário de diagnóstico:
${answersAsText(answers)}

Analise e devolve a estrutura JSON pedida. Para "performance", use "pontos_fortes" para objetivos claros já definidos, "problemas" para lacunas de mensuração, "oportunidades" para metas e indicadores que a Syna deve implantar. O campo "principal_oportunidade" deve ser uma frase curta com a oportunidade de maior impacto. O "resumo_executivo" deve ter de 1 a 3 parágrafos.`;

  const { result: ai, error } = await callAi(prompt);
  const analysis = ai ?? fallbackAnalysis(answers);

  const nowIso = new Date().toISOString();
  const scores = PILLARS.map((p) => {
    const r = analysis[p];
    const nota = Math.max(0, Math.min(10, Number(r?.nota ?? 5)));
    return {
      diagnostic_id: diagnosticId,
      pillar: p,
      auto_score: nota,
      final_score: nota,
      summary: r?.resumo ?? "",
      strengths: r?.pontos_fortes ?? [],
      problems: r?.problemas ?? [],
      risks: r?.riscos ?? [],
      opportunities: r?.oportunidades ?? [],
      priority: (["alta", "media", "baixa"].includes(r?.prioridade ?? "")
        ? r.prioridade
        : "media") as "alta" | "media" | "baixa",
    };
  });

  const { error: upsertError } = await db
    .from("pillar_scores")
    .upsert(scores, { onConflict: "diagnostic_id,pillar" });
  if (upsertError) throw new Error(upsertError.message);

  const fourP = scores.filter((s) => FOUR_PS.includes(s.pillar));
  const overall =
    Math.round((fourP.reduce((a, s) => a + s.auto_score, 0) / (fourP.length || 1)) * 10) / 10;
  const sorted = [...fourP].sort((a, b) => a.auto_score - b.auto_score);
  const bottleneckPillar: Pillar = sorted[0]?.pillar ?? "produto";

  await db
    .from("diagnostics")
    .update({
      status: "em_analise",
      overall_score: overall,
      executive_summary: analysis.resumo_executivo ?? "",
      main_bottleneck: bottleneckPillar,
      main_opportunity: analysis.principal_oportunidade ?? "",
      analyzed_at: nowIso,
    })
    .eq("id", diagnosticId);

  return {
    ok: true,
    usedAi: Boolean(ai),
    warning: error,
    overall,
    bottleneck: PILLAR_LABEL[bottleneckPillar],
  };
}

export interface PublicReport {
  companyName: string;
  createdAt: string;
  validatedAt: string | null;
  overallScore: number | null;
  executiveSummary: string | null;
  mainBottleneck: string | null;
  mainOpportunity: string | null;
  scores: {
    pillar: string;
    score: number | null;
    summary: string | null;
    strengths: string[];
    problems: string[];
    risks: string[];
    opportunities: string[];
    priority: string;
  }[];
  actions: { title: string; description: string | null; priority: string; status: string }[];
}

/** Relatório somente leitura para o cliente, liberado após a validação da equipe. */
export async function fetchReportByToken(token: string): Promise<PublicReport | null> {
  const db = await admin();
  const { data: diag } = await db
    .from("diagnostics")
    .select(
      "id, client_id, status, created_at, validated_at, overall_score, executive_summary, main_bottleneck, main_opportunity",
    )
    .eq("token", token)
    .maybeSingle();
  if (!diag || diag.status !== "validado") return null;

  const [{ data: client }, { data: scores }, { data: actions }] = await Promise.all([
    db.from("clients").select("company_name, trade_name").eq("id", diag.client_id).maybeSingle(),
    db.from("pillar_scores").select("*").eq("diagnostic_id", diag.id),
    db
      .from("action_items")
      .select("title, description, priority, status")
      .eq("diagnostic_id", diag.id),
  ]);

  return {
    companyName: client?.trade_name || client?.company_name || "sua empresa",
    createdAt: diag.created_at,
    validatedAt: diag.validated_at,
    overallScore: diag.overall_score == null ? null : Number(diag.overall_score),
    executiveSummary: diag.executive_summary,
    mainBottleneck: diag.main_bottleneck,
    mainOpportunity: diag.main_opportunity,
    scores: (scores ?? []).map((s) => ({
      pillar: s.pillar as string,
      score:
        s.final_score != null
          ? Number(s.final_score)
          : s.auto_score != null
            ? Number(s.auto_score)
            : null,
      summary: s.summary,
      strengths: s.strengths ?? [],
      problems: s.problems ?? [],
      risks: s.risks ?? [],
      opportunities: s.opportunities ?? [],
      priority: s.priority as string,
    })),
    actions: (actions ?? []).map((a) => ({
      title: a.title,
      description: a.description,
      priority: a.priority as string,
      status: a.status as string,
    })),
  };
}
