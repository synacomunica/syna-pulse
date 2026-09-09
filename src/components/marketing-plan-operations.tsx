import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json, Database } from "@/integrations/supabase/types";
import {
  JOURNEY_STAGES,
  STAGE_LABEL,
  STAGE_QUESTION,
  PRIORITY_ORDER,
  type MarketingPlanContent,
} from "@/lib/marketing-plan";
import {
  attainment,
  integrationId,
  journeyStatus,
  funnelRatios,
} from "@/lib/marketing-plan-metrics";
import { METRICS, FOUR_PS } from "@/lib/pillars";
import { formatMetric } from "@/lib/format";

export function PlanOperations({
  plan,
  content,
  dirty,
}: {
  plan: Tables<"marketing_plans">;
  content: MarketingPlanContent;
  dirty: boolean;
}) {
  const qc = useQueryClient();
  const [days, setDays] = useState(90);
  const [metric, setMetric] = useState("leads");
  const [target, setTarget] = useState("");
  const [end, setEnd] = useState("");
  const [objective, setObjective] = useState(0);
  const query = useQuery({
    queryKey: ["plan-execution", plan.id],
    queryFn: async () => {
      const ids = await Promise.all(
        content.acoes.map((_, i) => integrationId(plan.id, "action", i)),
      );
      const goalIds = await Promise.all(
        [content.objetivo_principal, ...content.objetivos_secundarios].map((_, i) =>
          integrationId(plan.id, "goal", i),
        ),
      );
      const [actions, metrics, goals, profiles] = await Promise.all([
        supabase.from("action_items").select("*").eq("client_id", plan.client_id),
        supabase
          .from("metric_values")
          .select("*")
          .eq("client_id", plan.client_id)
          .order("period_date", { ascending: false }),
        supabase.from("goals").select("*").eq("client_id", plan.client_id),
        supabase.from("profiles").select("id,full_name"),
      ]);
      for (const result of [actions, metrics, goals, profiles])
        if (result.error) throw result.error;
      return {
        actions: actions.data?.filter((a) => ids.includes(a.id)) ?? [],
        metrics: metrics.data ?? [],
        goals: goals.data?.filter((g) => goalIds.includes(g.id)) ?? [],
        approver: profiles.data?.find((p) => p.id === plan.approved_by)?.full_name,
      };
    },
  });
  const mutation = useMutation({
    mutationFn: async ({
      kind,
      index = 0,
    }: {
      kind: "action" | "goal" | "version" | "delete";
      index?: number;
    }) => {
      if (dirty) throw new Error("Salve o rascunho antes de continuar.");
      if (kind === "delete") {
        const { error } = await supabase
          .from("marketing_plans")
          .delete()
          .eq("id", plan.id)
          .eq("status", "rascunho_ia");
        if (error) throw error;
        return;
      }
      if (kind === "version") {
        const { data, error } = await supabase
          .from("marketing_plans")
          .select("version")
          .eq("client_id", plan.client_id)
          .order("version", { ascending: false })
          .limit(1);
        if (error) throw error;
        const result = await supabase.from("marketing_plans").insert({
          client_id: plan.client_id,
          diagnostic_id: plan.diagnostic_id,
          version: (data[0]?.version ?? 0) + 1,
          content: plan.content as Json,
          ai_warning:
            "Nova revisão manual. Revise evidências, metas e aprendizados antes de aprovar.",
        });
        if (result.error) throw result.error;
        return;
      }
      if (plan.status !== "aprovado")
        throw new Error("Aprove o plano antes de enviar ações ou metas para execução.");
      if (kind === "goal") {
        if (!target.trim() || !Number.isFinite(Number(target)) || Number(target) <= 0 || !end)
          throw new Error("Informe uma meta positiva e uma data final.");
        const { error } = await supabase.from("goals").upsert({
          id: await integrationId(plan.id, "goal", objective),
          client_id: plan.client_id,
          metric_key: metric,
          target_value: Number(target),
          period_start: new Date().toISOString().slice(0, 10),
          period_end: end,
        });
        if (error) throw error;
        return;
      }
      const action = content.acoes[index];
      if (!action) throw new Error("Ação não encontrada.");
      if (action.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(action.prazo))
        throw new Error("Revise o prazo desta ação para uma data no formato AAAA-MM-DD.");
      const pillar = FOUR_PS.includes(action.pilar as (typeof FOUR_PS)[number])
        ? (action.pilar as Database["public"]["Enums"]["pillar"])
        : null;
      const { error } = await supabase.from("action_items").upsert(
        {
          id: await integrationId(plan.id, "action", index),
          client_id: plan.client_id,
          diagnostic_id: plan.diagnostic_id,
          title: action.titulo,
          description: `${action.descricao}\nObjetivo: ${action.objetivo}\nEstratégia: ${action.estrategia}\n5A: ${action.etapa}\nCategoria: ${action.categoria}\nPrioridade estratégica: ${action.prioridade}\nPlano v${plan.version}`,
          pillar,
          priority:
            action.prioridade === "critica" || action.prioridade === "alta"
              ? "alta"
              : action.prioridade === "baixa"
                ? "baixa"
                : "media",
          due_date: action.prazo || null,
          owner_name: action.responsavel || null,
          expected_result: `${action.kpi}: ${action.meta}`,
          status: "planejado",
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Operação concluída.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["plan-execution", plan.id] }),
        qc.invalidateQueries({ queryKey: ["marketing-plans", plan.client_id] }),
        qc.invalidateQueries({ queryKey: ["performance", plan.client_id] }),
        qc.invalidateQueries({ queryKey: ["actions"] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ratios = funnelRatios(content.funil, content.funil_contexto);
  const actions = query.data?.actions ?? [];
  const overdue = actions.some(
    (a) =>
      a.status !== "concluido" && a.due_date && a.due_date < new Date().toISOString().slice(0, 10),
  );
  const executionGoals = (query.data?.goals ?? []).map((g) => {
    const value = query.data?.metrics.find(
      (m) =>
        m.metric_key === g.metric_key &&
        (!g.period_start || m.period_date >= g.period_start.slice(0, 7) + "-01") &&
        (!g.period_end || m.period_date <= g.period_end),
    );
    const def = METRICS.find((m) => m.key === g.metric_key);
    return {
      goal: g,
      value,
      progress: attainment(value?.value ?? null, g.target_value, def?.inverse),
    };
  });
  const achieved =
    executionGoals.length > 0 &&
    executionGoals.every((g) => g.progress !== null && g.progress >= 100);
  const cutoff = new Date(plan.created_at);
  cutoff.setDate(cutoff.getDate() + days);
  return (
    <div className="space-y-5">
      <section className="surface-card space-y-3 p-5">
        <h2 className="text-lg font-bold">
          Visão do plano ·{" "}
          {overdue
            ? "Atrasado"
            : achieved
              ? "Meta atingida"
              : actions.length
                ? "Em andamento"
                : "Aguardando execução"}
        </h2>
        <p>
          <strong>Objetivo:</strong> {content.objetivo_principal.descricao || "A definir"}
        </p>
        <p>
          <strong>Gargalo:</strong> {content.relacao_4p_5a.pilar || "A investigar"} →{" "}
          {content.gargalo_jornada.etapa || "Dados insuficientes"}
        </p>
        <p>
          <strong>Estratégia:</strong> {content.estrategia_central || "A definir"}
        </p>
        <p>
          {content.acoes.length} ações propostas ·{" "}
          {actions.filter((a) => a.status === "concluido").length} concluídas ·{" "}
          {actions.filter((a) => a.status === "em_andamento").length} em andamento ·{" "}
          {actions.filter((a) => ["planejado", "backlog"].includes(a.status)).length} pendentes
        </p>
        {plan.approved_by && <p>Aprovado por {query.data?.approver || plan.approved_by}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            disabled={mutation.isPending || dirty}
            onClick={() => mutation.mutate({ kind: "version" })}
          >
            Criar nova revisão
          </button>
          {plan.status === "rascunho_ia" && (
            <button
              className="btn-ghost"
              disabled={mutation.isPending || dirty}
              onClick={() => {
                if (confirm("Excluir este rascunho? Somente administradores podem excluir."))
                  mutation.mutate({ kind: "delete" });
              }}
            >
              Excluir rascunho
            </button>
          )}
          <Link className="btn-ghost" to="/plano-de-acao">
            Abrir Plano de Ação
          </Link>
          <Link className="btn-ghost" to="/performance">
            Abrir Performance
          </Link>
        </div>
        {query.isError && <p role="alert">{query.error.message}</p>}
      </section>
      <section className="surface-card p-5">
        <h2 className="mb-4 text-lg font-bold">Jornada do Cliente — 5A</h2>
        <div className="grid gap-3 md:grid-cols-5">
          {JOURNEY_STAGES.map((stage) => {
            const value = content.jornada_5a.find((j) => j.etapa === stage);
            return (
              <article key={stage} className="rounded-lg border border-border p-3">
                <h3 className="font-bold">{STAGE_LABEL[stage]}</h3>
                <p className="my-2 text-xs">{STAGE_QUESTION[stage]}</p>
                <p className="text-2xl font-bold">
                  {value?.nota == null ? "—" : value.nota.toFixed(1)}
                </p>
                <progress
                  className="w-full accent-primary"
                  max={10}
                  value={value?.nota ?? 0}
                  aria-label={STAGE_LABEL[stage]}
                />
                <p className="text-xs">{journeyStatus(value?.nota ?? null)}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-sm">{content.gargalo_jornada.diagnostico}</p>
      </section>
      <section className="surface-card p-5">
        <h2 className="font-bold">Funil e eficiência</h2>
        <p className="text-sm text-muted-foreground">
          Contagens devem representar a mesma população e período. Não confundir notas com pessoas.
        </p>
        <div className="my-3 flex flex-wrap gap-3">
          {JOURNEY_STAGES.map((stage, i) => {
            const value = content.funil.find((f) => f.etapa === stage)?.valor;
            const previous = content.funil.find((f) => f.etapa === JOURNEY_STAGES[i - 1])?.valor;
            return (
              <div key={stage} className="rounded border p-3">
                <strong>{stage.toUpperCase()}</strong>
                <p>{value == null ? "Dados insuficientes" : value.toLocaleString("pt-BR")}</p>
                {previous != null && previous > 0 && value != null && (
                  <p>{((100 * value) / previous).toFixed(1)}% de passagem</p>
                )}
              </div>
            );
          })}
        </div>
        <p>
          PAR: {ratios.par ?? "Dados insuficientes"} · BAR: {ratios.bar ?? "Dados insuficientes"}
        </p>
        <p className="text-sm">{content.par_bar.observacao}</p>
      </section>
      <section className="surface-card space-y-3 p-5">
        <h2 className="font-bold">Execução e cronograma</h2>
        <select
          aria-label="Horizonte do cronograma"
          className="input-base"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[
            [30, "30 dias"],
            [60, "60 dias"],
            [90, "90 dias"],
            [180, "6 meses"],
            [365, "12 meses"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-sm">
          Horizonte a partir da criação do plano. Ações sem data permanecem visíveis para
          planejamento.
        </p>
        {content.acoes
          .map((action, index) => ({ action, index }))
          .filter(
            ({ action }) =>
              !/^\d{4}-\d{2}-\d{2}$/.test(action.prazo) ||
              action.prazo <= cutoff.toISOString().slice(0, 10),
          )
          .sort(
            (a, b) =>
              (PRIORITY_ORDER[a.action.prioridade] ?? 4) -
              (PRIORITY_ORDER[b.action.prioridade] ?? 4),
          )
          .map(({ action, index }) => (
            <article key={index} className="rounded-lg border border-border p-4">
              <h3 className="font-bold">
                {action.titulo} · {action.prioridade}
              </h3>
              <p>
                {action.objetivo} → {action.estrategia}
              </p>
              <p className="text-sm">
                {action.pilar} · {action.etapa} · {action.responsavel || "Responsável a definir"} ·{" "}
                {action.prazo || "Sem prazo"} · {action.fase}
              </p>
              <p className="text-sm">
                {action.kpi}: {action.meta || "Meta a definir"}
              </p>
              <button
                className="btn-ghost mt-2"
                disabled={dirty || mutation.isPending || plan.status !== "aprovado"}
                onClick={() => mutation.mutate({ kind: "action", index })}
              >
                Adicionar ao Plano de Ação
              </button>
            </article>
          ))}
        {plan.status !== "aprovado" && (
          <p className="text-sm">Valide o plano antes de enviar para execução.</p>
        )}
      </section>
      <section className="surface-card space-y-3 p-5">
        <h2 className="font-bold">Metas e Performance</h2>
        {executionGoals.map(({ goal, value, progress }) => (
          <div key={goal.id} className="rounded border p-3">
            <strong>
              {METRICS.find((m) => m.key === goal.metric_key)?.label ?? goal.metric_key}
            </strong>
            <p>
              Atual:{" "}
              {value
                ? formatMetric(
                    value.value,
                    METRICS.find((m) => m.key === goal.metric_key)?.format ?? "number",
                  )
                : "Dados insuficientes"}{" "}
              / Meta:{" "}
              {formatMetric(
                goal.target_value,
                METRICS.find((m) => m.key === goal.metric_key)?.format ?? "number",
              )}
            </p>
            <p>
              {progress === null ? "Aguardando medição" : `${progress.toFixed(1)}% de atingimento`}
              {value ? ` · Medição: ${value.period_date}` : ""}
            </p>
          </div>
        ))}
        <label className="block">
          Objetivo a conectar
          <select
            className="input-base"
            value={objective}
            onChange={(e) => {
              const i = Number(e.target.value);
              setObjective(i);
              setTarget(
                String(
                  [content.objetivo_principal, ...content.objetivos_secundarios][i]?.meta ?? "",
                ),
              );
            }}
          >
            {[content.objetivo_principal, ...content.objetivos_secundarios].map((o, i) => (
              <option key={i} value={i}>
                {o.descricao || "Objetivo principal"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Indicador de Performance
          <select className="input-base" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
                {m.inverse ? " (máximo)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Meta
            <input
              className="input-base"
              type="number"
              min="0"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label>
            Prazo
            <input
              className="input-base"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <button
          className="btn-primary"
          disabled={dirty || mutation.isPending || plan.status !== "aprovado"}
          onClick={() => mutation.mutate({ kind: "goal" })}
        >
          Conectar meta à Performance
        </button>
      </section>
    </div>
  );
}
