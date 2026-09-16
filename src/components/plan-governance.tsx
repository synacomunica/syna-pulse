import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reviewMarketingPlan } from "@/lib/plan-review.functions";
import type { MarketingPlanContent } from "@/lib/marketing-plan";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
const states = {
  rascunho: "Rascunho",
  aguardando_informacoes: "Aguardando informações ou decisões",
  pronto_revisao: "Pronto para revisão humana",
};
export function PlanGovernance({
  plan,
  content,
  dirty,
  onSelect,
}: {
  plan: Tables<"marketing_plans">;
  content: MarketingPlanContent;
  dirty: boolean;
  onSelect: (id: string) => void;
}) {
  const g = content.governanca;
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const current = useQuery({
    queryKey: ["scope-for-plan", plan.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_scopes")
        .select("id,version,status,origin")
        .eq("client_id", plan.client_id)
        .order("version", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data[0] ?? null;
    },
  });
  const changed = (current.data?.id ?? "") !== (g?.scopeId ?? "");
  return (
    <section className="surface-card p-5 space-y-3">
      <h2 className="font-bold">Fundamentos e condições de execução</h2>
      <p>
        {plan.status === "aprovado"
          ? "Aprovado para execução — condições abaixo permanecem válidas"
          : g
            ? states[g.state]
            : "Plano anterior às verificações atuais; revalide em nova versão."}
      </p>
      <p className="text-sm">
        Escopo utilizado:{" "}
        {g?.scopeVersion ? `versão ${g.scopeVersion}` : "sem conferência contratual"}.{" "}
        {current.data?.origin === "manual" ? "Escopo informado manualmente." : ""} Verificações
        automáticas não equivalem à aprovação do cliente.
      </p>
      {current.error && <p role="alert">Não foi possível conferir se o escopo permanece atual.</p>}
      {changed && (
        <p role="alert" className="text-destructive">
          O escopo mudou. Quantidades, responsáveis e prazos podem precisar de revisão. O plano
          anterior será preservado.
        </p>
      )}
      <button
        disabled={busy || dirty}
        className="btn-ghost"
        onClick={async () => {
          setBusy(true);
          try {
            const next = await reviewMarketingPlan({
              data: {
                planId: plan.id,
                revision: plan.updated_at,
                content,
                approve: false,
                newVersion: true,
              },
            });
            await qc.invalidateQueries({ queryKey: ["marketing-plans", plan.client_id] });
            onSelect(next.id);
            toast.success("Nova versão criada para revisar as partes afetadas.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha na revalidação.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Revalidando…" : "Revalidar fontes e escopo em nova versão"}
      </button>
      {g && (
        <>
          <p className="text-sm">
            Regras {g.instructionVersion} · validações {g.validationVersion}
          </p>
          <details open={g.checks.length > 0}>
            <summary>Pendências e verificações ({g.checks.length})</summary>
            {g.checks.map((c, i) => (
              <p className="border-l-2 pl-3 my-2" key={i}>
                <strong>{c.severity === "bloqueio" ? "Decisão necessária" : "Atenção"}:</strong>{" "}
                {c.message} {c.actionId && `Ação: ${c.actionId}`}
              </p>
            ))}
            {g.issues.map((i) => (
              <p key={i.id}>
                {i.priority}: {i.question} {i.resolution && ` — Decisão: ${i.resolution}`}
              </p>
            ))}
          </details>
          <details>
            <summary>Ações liberadas e condicionais</summary>
            {g.actions.map((a) => (
              <article key={a.actionId} className="border-b py-3">
                <h3 className="font-semibold">
                  {a.title} · {a.release}
                </h3>
                <p>
                  {a.problem} → {a.deliverable}
                </p>
                <p>
                  Escopo: {a.scopeClass} · Responsável: {a.owner || "a definir"}
                </p>
                <p>
                  Início: {a.startCondition || "a confirmar"} · {a.relativeWindow || a.startDate} ·
                  Pré-requisitos: {a.prerequisites.join(", ") || "nenhum informado"}
                </p>
                <p>
                  Recursos: {a.resources} · Conclusão: {a.completion} · Indicador: {a.metricId}
                </p>
                <p>Fontes: {a.evidenceIds.join(", ")}</p>
              </article>
            ))}
          </details>
          <details>
            <summary>Consultar fontes e referências</summary>
            {g.sources.map((s) => (
              <article key={s.id} className="border-b py-2 text-sm">
                <strong>
                  {s.id} · {s.kind}
                </strong>
                <p>
                  {s.reference} · {s.date}
                </p>
                <p className="whitespace-pre-wrap break-words">{s.value}</p>
              </article>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
