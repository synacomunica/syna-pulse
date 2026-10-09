import { calculateScenario, scenarioSchema } from "./marketing-scenario";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Source } from "./planning-policy";
export async function diagnosticSources(
  db: SupabaseClient<Database>,
  diagnosticId: string,
  clientId: string,
): Promise<Source[]> {
  const [answers, scores, diagnostic, client, metrics] = await Promise.all([
    db.from("answers").select("question_key,value,pillar").eq("diagnostic_id", diagnosticId),
    db.from("pillar_scores").select("*").eq("diagnostic_id", diagnosticId),
    db
      .from("diagnostics")
      .select("submitted_at,validated_at")
      .eq("id", diagnosticId)
      .eq("client_id", clientId)
      .single(),
    db
      .from("clients")
      .select("company_name,notes,segment,city,updated_at")
      .eq("id", clientId)
      .single(),
    db
      .from("metric_values")
      .select("*")
      .eq("client_id", clientId)
      .order("period_date", { ascending: false })
      .limit(200),
  ]);
  for (const r of [answers, scores, diagnostic, client, metrics]) if (r.error) throw r.error;
  const scenarios = await db
    .from("marketing_scenarios")
    .select("id,content,updated_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (scenarios.error) throw scenarios.error;
  const row = scenarios.data[0];
  const scenario = row ? scenarioSchema.safeParse(row.content) : null;
  const scenarioSources: Source[] =
    row && scenario?.success
      ? [
          {
            id: `scenario:${row.id}`,
            kind: "hipotese",
            date: row.updated_at,
            reference: `Cenário de metas — ${scenario.data.month} (simulação, não resultado observado)`,
            value: JSON.stringify({
              premissas: scenario.data,
              calculos: calculateScenario(scenario.data),
            }),
          },
        ]
      : [];
  return [
    ...scenarioSources,
    ...Object.entries(client.data ?? {}).map(([key, value]) => ({
      id: `client:${key}`,
      kind: "declarado" as const,
      reference: `Cadastro: ${key}`,
      date: client.data?.updated_at ?? "",
      value: JSON.stringify(value),
    })),
    ...(answers.data ?? []).map((a) => ({
      id: `answer:${a.question_key}`,
      kind: "declarado" as const,
      reference: `Diagnóstico ${diagnosticId}, resposta ${a.question_key}`,
      date: diagnostic.data?.submitted_at ?? "",
      value: JSON.stringify(a.value),
    })),
    ...(scores.data ?? []).map((a) => ({
      id: `score:${a.pillar}`,
      kind: "interpretacao" as const,
      reference: `Avaliação qualitativa ${a.pillar}`,
      date: diagnostic.data?.validated_at ?? "",
      value: JSON.stringify(a),
    })),
    ...(metrics.data ?? []).map((a) => ({
      id: `metric:${a.id}`,
      kind: "declarado" as const,
      reference: "Métrica registrada no sistema; não implica auditoria",
      date: a.period_date,
      value: JSON.stringify(a),
    })),
  ];
}
