import { PlanOperations } from "@/components/marketing-plan-operations";
import { generateMarketingPlan } from "@/lib/marketing-plan.functions";
import { useState } from "react";
import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { MarketingPlanContentView } from "@/components/marketing-plan-content";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json } from "@/integrations/supabase/types";
import { PLAN_STATUS_LABEL, type MarketingPlanContent } from "@/lib/marketing-plan";
import { marketingPlanSchema, parseMarketingPlan } from "@/lib/marketing-plan-schema";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plano-de-marketing/$clientId")({
  validateSearch: (search: Record<string, unknown>): { diagnosticId?: string } =>
    typeof search["diagnosticId"] === "string" ? { diagnosticId: search["diagnosticId"] } : {},
  head: () => ({ meta: [{ title: "Plano de Marketing — Syna Marketing Diagnostic" }] }),
  component: MarketingPlanPage,
});

function MarketingPlanPage() {
  const { clientId } = Route.useParams();
  const { diagnosticId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [sourceId, setSourceId] = useState(diagnosticId ?? "");
  const [compareId, setCompareId] = useState("");
  const qc = useQueryClient();
  const diagnostics = useQuery({
    queryKey: ["plan-diagnostics", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostics")
        .select("id,title,status,created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const generation = useMutation({
    mutationFn: async () => {
      if (dirty) throw new Error("Salve suas alterações antes de gerar outra versão.");
      const id = sourceId || diagnostics.data?.find((d) => d.status === "validado")?.id;
      if (!id) throw new Error("Valide um diagnóstico antes de gerar o plano.");
      return generateMarketingPlan({ data: { diagnosticId: id } });
    },
    onSuccess: async (plan) => {
      setSelectedId(plan.id);
      await qc.invalidateQueries({ queryKey: ["marketing-plans", clientId] });
      toast.success("Rascunho criado. Revise antes de aprovar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      if (!confirm("Descartar as alterações não salvas?")) return true;
      setDirty(false);
      return false;
    },
    enableBeforeUnload: dirty,
  });
  const query = useQuery({
    queryKey: ["marketing-plans", clientId, diagnosticId],
    queryFn: async () => {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("id", clientId)
        .maybeSingle();
      if (clientError) throw clientError;
      if (diagnosticId) {
        const { data: diagnostic, error } = await supabase
          .from("diagnostics")
          .select("id")
          .eq("id", diagnosticId)
          .eq("client_id", clientId)
          .maybeSingle();
        if (error) throw error;
        if (!diagnostic) throw new Error("Diagnóstico não encontrado para este cliente.");
      }
      let request = supabase
        .from("marketing_plans")
        .select("*")
        .eq("client_id", clientId)
        .order("version", { ascending: false })
        .order("created_at", { ascending: false });
      if (diagnosticId) request = request.eq("diagnostic_id", diagnosticId);
      const { data: plans, error } = await request;
      if (error) throw error;
      return { client, plans: plans ?? [] };
    },
  });
  const selected = query.data?.plans.find((plan) => plan.id === selectedId) ?? query.data?.plans[0];
  return (
    <AppShell
      title="Plano de Marketing"
      subtitle={query.data?.client?.company_name}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link className="btn-ghost" to="/clientes/$id" params={{ id: clientId }}>
            Voltar ao cliente
          </Link>
          {diagnosticId && (
            <Link className="btn-ghost" to="/diagnosticos/$id" params={{ id: diagnosticId }}>
              Voltar ao diagnóstico
            </Link>
          )}
        </div>
      }
    >
      <section className="surface-card mb-5 flex flex-wrap items-center gap-3 p-4">
        <label>
          Diagnóstico validado
          <select
            className="input-base"
            value={sourceId || diagnostics.data?.find((d) => d.status === "validado")?.id || ""}
            onChange={(e) => setSourceId(e.target.value)}
          >
            {!diagnostics.data?.some((d) => d.status === "validado") && (
              <option value="">Nenhum diagnóstico validado</option>
            )}
            {diagnostics.data
              ?.filter((d) => d.status === "validado")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || formatDate(d.created_at)}
                </option>
              ))}
          </select>
        </label>
        <button
          className="btn-primary"
          disabled={
            generation.isPending || dirty || !diagnostics.data?.some((d) => d.status === "validado")
          }
          onClick={() => generation.mutate()}
        >
          {generation.isPending ? "Gerando plano…" : "Gerar Plano de Marketing"}
        </button>
        <p className="text-sm text-muted-foreground">
          Cada geração cria uma nova versão. As versões anteriores são preservadas.
        </p>
        {diagnostics.data
          ?.filter((d) => d.status !== "validado")
          .map((d) => (
            <Link key={d.id} className="btn-ghost" to="/diagnosticos/$id" params={{ id: d.id }}>
              Revisar diagnóstico {d.title || formatDate(d.created_at)} →
            </Link>
          ))}
        {diagnostics.isError && <p role="alert">{diagnostics.error.message}</p>}
      </section>
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando planos...</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <button className="btn-ghost" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : !query.data.client ? (
        <p>Cliente não encontrado.</p>
      ) : query.data.plans.length === 0 ? (
        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Nenhum plano disponível</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ainda não há versões de plano de marketing para este{" "}
            {diagnosticId ? "diagnóstico" : "cliente"}.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="surface-card self-start p-4">
            <h2 className="mb-3 font-bold">Versões</h2>
            <div className="space-y-2">
              {query.data.plans.map((plan) => (
                <button
                  key={plan.id}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${selected?.id === plan.id ? "border-primary bg-primary/8" : "border-border"}`}
                  aria-pressed={selected?.id === plan.id}
                  onClick={() => {
                    if (
                      selected?.id !== plan.id &&
                      (!dirty || confirm("Descartar as alterações não salvas?"))
                    ) {
                      setDirty(false);
                      setSelectedId(plan.id);
                    }
                  }}
                >
                  <span className="block font-semibold">Versão {plan.version}</span>
                  <span className="block">{PLAN_STATUS_LABEL[plan.status] ?? plan.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(plan.created_at)}
                  </span>
                </button>
              ))}
            </div>
          </aside>
          {selected && (
            <div className="min-w-0 space-y-4">
              <label className="block">
                Comparar com
                <select
                  className="input-base"
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                >
                  <option value="">Escolher versão</option>
                  {query.data.plans
                    .filter((p) => p.id !== selected.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Versão {p.version}
                      </option>
                    ))}
                </select>
              </label>
              {compareId && query.data.plans.find((p) => p.id === compareId) && (
                <div className="surface-card p-4">
                  <h2 className="font-bold">Comparação estratégica</h2>
                  {[
                    "diagnostico_partida",
                    "objetivo_principal",
                    "estrategia_central",
                    "kpis",
                    "aprendizados",
                  ].map((key) => {
                    const previous = query.data.plans.find((p) => p.id === compareId)
                      ?.content as Record<string, Json>;
                    const current = selected.content as Record<string, Json>;
                    return (
                      <details key={key}>
                        <summary>
                          {key.replaceAll("_", " ")} ·{" "}
                          {JSON.stringify(previous[key]) === JSON.stringify(current[key])
                            ? "Sem alteração"
                            : "Alterado"}
                        </summary>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded border p-3">
                            <h3 className="font-bold">Versão comparada</h3>
                            <ComparisonValue value={previous[key]} />
                          </div>
                          <div className="rounded border p-3">
                            <h3 className="font-bold">Versão selecionada</h3>
                            <ComparisonValue value={current[key]} />
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
              <PlanEditor key={selected.id} plan={selected} dirty={dirty} setDirty={setDirty} />
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function PlanEditor({
  plan,
  dirty,
  setDirty,
}: {
  plan: Tables<"marketing_plans">;
  dirty: boolean;
  setDirty: (value: boolean) => void;
}) {
  const [revision, setRevision] = useState(plan.updated_at);
  const parsed = marketingPlanSchema.safeParse(plan.content);
  const [draft, setDraft] = useState<MarketingPlanContent | null>(() =>
    parsed.success ? parsed.data : null,
  );
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const mutation = useMutation({
    mutationFn: async (approve: boolean) => {
      if (!draft || plan.status !== "rascunho_ia")
        throw new Error("Somente rascunhos válidos podem ser alterados.");
      const content = parseMarketingPlan(draft);
      if (
        approve &&
        (!content.resumo_estrategico.trim() ||
          !content.objetivo_principal.descricao.trim() ||
          !content.estrategia_central.trim() ||
          !content.acoes.length ||
          content.acoes.some((a) => !a.objetivo.trim() || !a.estrategia.trim() || !a.kpi.trim()))
      )
        throw new Error(
          "Complete o resumo, objetivo, estratégia e ações com objetivo, estratégia e KPI antes de aprovar.",
        );
      const { data, error } = await supabase
        .from("marketing_plans")
        .update({
          content: content as unknown as Json,
          ...(approve
            ? { status: "aprovado", approved_by: user.id, approved_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", plan.id)
        .eq("client_id", plan.client_id)
        .eq("status", "rascunho_ia")
        .eq("updated_at", revision)
        .select("updated_at")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error(
          "O plano foi alterado por outra pessoa. Recarregue a página antes de tentar novamente.",
        );
      return data.updated_at;
    },
    onSuccess: async (updatedAt, approve) => {
      setRevision(updatedAt);
      setDirty(false);
      setEditing(false);
      toast.success(approve ? "Plano aprovado." : "Rascunho salvo.");
      await qc.invalidateQueries({ queryKey: ["marketing-plans", plan.client_id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="min-w-0 space-y-5" data-plan-dirty={dirty}>
      <section className="surface-card p-5">
        <h2 className="text-lg font-bold">
          Versão {plan.version} · {PLAN_STATUS_LABEL[plan.status] ?? plan.status}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualizado em {formatDate(plan.updated_at)}
          {plan.approved_at ? ` · Aprovado em ${formatDate(plan.approved_at)}` : ""}
        </p>
        {plan.diagnostic_id && (
          <Link
            className="mt-2 inline-block text-sm text-primary"
            to="/diagnosticos/$id"
            params={{ id: plan.diagnostic_id }}
          >
            Ver diagnóstico de origem
          </Link>
        )}
        {plan.status === "rascunho_ia" && draft && (
          <div className="mt-4 flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  className="btn-primary"
                  disabled={mutation.isPending || !dirty}
                  onClick={() => mutation.mutate(false)}
                >
                  Salvar rascunho
                </button>
                <button
                  className="btn-ghost"
                  disabled={mutation.isPending}
                  onClick={() => {
                    if (!dirty || confirm("Descartar as alterações não salvas?")) {
                      setDraft(parseMarketingPlan(plan.content));
                      setRevision(plan.updated_at);
                      setEditing(false);
                      setDirty(false);
                    }
                  }}
                >
                  Cancelar edição
                </button>
              </>
            ) : (
              <button
                className="btn-ghost"
                disabled={mutation.isPending}
                onClick={() => setEditing(true)}
              >
                Editar rascunho
              </button>
            )}
            <button
              className="btn-primary"
              disabled={mutation.isPending || dirty}
              onClick={() => {
                if (
                  confirm(
                    "Aprovar esta versão? O plano aprovado ficará disponível apenas para leitura.",
                  )
                )
                  mutation.mutate(true);
              }}
            >
              Validar Plano de Marketing
            </button>
            {dirty && (
              <p className="w-full text-sm text-muted-foreground">
                Há alterações não salvas. Salve o rascunho antes de aprovar.
              </p>
            )}
            {mutation.isPending && <p role="status">Salvando...</p>}
          </div>
        )}
      </section>
      {plan.ai_warning && (
        <section role="alert" className="rounded-lg border border-warning/30 bg-warning/15 p-4">
          <h2 className="font-semibold">Aviso da IA</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{plan.ai_warning}</p>
        </section>
      )}
      {draft && <PlanOperations plan={plan} content={draft} dirty={dirty} />}
      {draft ? (
        <fieldset disabled={mutation.isPending}>
          <MarketingPlanContentView
            content={draft}
            onChange={
              editing && plan.status === "rascunho_ia"
                ? (value) => {
                    setDraft(value);
                    setDirty(true);
                  }
                : undefined
            }
          />
        </fieldset>
      ) : (
        <p role="alert" className="surface-card p-5">
          O conteúdo desta versão tem um formato inválido e não pode ser editado ou aprovado.
        </p>
      )}
    </div>
  );
}

function ComparisonValue({ value }: { value: Json | undefined }) {
  if (value == null || value === "")
    return <p className="text-sm text-muted-foreground">Não informado</p>;
  if (Array.isArray(value))
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="border-b py-2">
            <ComparisonValue value={item} />
          </div>
        ))}
      </div>
    );
  if (typeof value === "object")
    return (
      <dl className="space-y-2">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt className="text-sm font-medium">{key.replaceAll("_", " ")}</dt>
            <dd>
              <ComparisonValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <p className="whitespace-pre-wrap text-sm">{String(value)}</p>;
}
