import { useState } from "react";
import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calculator, Target, Wallet, Users, ArrowRight, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  calculateScenario,
  diagnosticScenario,
  newScenario,
  scenarioSchema,
  type Scenario,
} from "@/lib/marketing-scenario";
import { saveScenario } from "@/lib/marketing-scenario.functions";
import type { Tables } from "@/integrations/supabase/types";
export const Route = createFileRoute("/_authenticated/metas")({
  validateSearch: (s: Record<string, unknown>): { clientId?: string } =>
    typeof s["clientId"] === "string" ? { clientId: s["clientId"] } : {},
  component: GoalsPage,
});
const money = (n: number | null) =>
  n == null
    ? "A definir"
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const count = (n: number | null) => (n == null ? "A definir" : n.toLocaleString("pt-BR"));
function GoalsPage() {
  const { clientId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({
    queryKey: ["scenario-clients"],
    queryFn: async () => {
      const r = await supabase.from("clients").select("id,company_name").order("company_name");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  return (
    <AppShell
      title="Metas e cenários"
      subtitle="Transforme uma intenção de crescimento em números para validar"
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-6">
          <div className="flex gap-3 items-center mb-4">
            <Calculator className="text-violet-600" />
            <div>
              <h2 className="font-bold text-lg">Antes da estratégia, a matemática do negócio</h2>
              <p className="text-sm text-muted-foreground">
                Diagnóstico → cenário → plano → conteúdos → resultados
              </p>
            </div>
          </div>
          <label className="block text-sm font-medium max-w-lg">
            Cliente
            <select
              className="input-base mt-1"
              value={clientId ?? ""}
              onChange={(e) => void navigate({ search: { clientId: e.target.value } })}
            >
              <option value="">Selecione um cliente</option>
              {q.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </label>
          {q.isError && (
            <button className="btn-outline mt-2" onClick={() => void q.refetch()}>
              Tentar carregar clientes novamente
            </button>
          )}
        </section>
        {clientId ? (
          <ScenarioWorkspace key={clientId} clientId={clientId} />
        ) : (
          <p className="text-muted-foreground">
            Escolha um cliente para simular e salvar cenários.
          </p>
        )}
      </div>
    </AppShell>
  );
}
function ScenarioWorkspace({ clientId }: { clientId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const { isAdmin } = useAuth();
  useBlocker({
    shouldBlockFn: () => dirty && !confirm("Sair sem salvar o cenário?"),
    enableBeforeUnload: dirty,
  });
  const q = useQuery({
    queryKey: ["scenarios", clientId],
    queryFn: async () => {
      const [rows, diagnostic] = await Promise.all([
        supabase
          .from("marketing_scenarios")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("diagnostics")
          .select("id,title,submitted_at,executive_summary,main_bottleneck")
          .eq("client_id", clientId)
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: false })
          .limit(1),
      ]);
      if (rows.error) throw rows.error;
      if (diagnostic.error) throw diagnostic.error;
      const d = diagnostic.data[0];
      const answers = d
        ? await supabase.from("answers").select("question_key,value").eq("diagnostic_id", d.id)
        : { data: [], error: null };
      if (answers.error) throw answers.error;
      const metrics = await supabase
        .from("metric_values")
        .select("metric_key,value,period_date")
        .eq("client_id", clientId)
        .order("period_date", { ascending: false })
        .limit(200);
      if (metrics.error) throw metrics.error;
      return {
        rows: rows.data,
        diagnostic: d,
        seed: diagnosticScenario(answers.data ?? []),
        metrics: metrics.data,
      };
    },
  });
  if (q.isPending) return <p role="status">Carregando cenários e diagnóstico…</p>;
  if (q.isError)
    return (
      <div role="alert" className="surface-card p-5">
        Não foi possível carregar os cenários.{" "}
        <button className="btn-outline" onClick={() => void q.refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  const row =
    selected === "new" ? undefined : (q.data.rows.find((r) => r.id === selected) ?? q.data.rows[0]);
  const parsed = row ? scenarioSchema.safeParse(row.content) : null;
  const choose = (id: string) => {
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    setDirty(false);
    setSelected(id);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm flex-1 max-w-lg">
          Cenário
          <select
            className="input-base mt-1"
            value={row?.id ?? "new"}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="new">Novo cenário</option>
            {q.data.rows.map((r, i) => (
              <option key={r.id} value={r.id}>
                Cenário {q.data.rows.length - i} ·{" "}
                {String((r.content as Record<string, unknown>)["month"] ?? "")} ·{" "}
                {new Date(r.created_at).toLocaleDateString("pt-BR")}
              </option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <button className="btn-outline" onClick={() => choose("new")}>
            Novo cenário
          </button>
        )}
        <Link className="btn-outline" to="/performance" search={{ clientId }}>
          Consultar resultados reais
        </Link>
      </div>
      {parsed && !parsed.success ? (
        <p role="alert">Não foi possível ler este cenário. Os dados foram preservados.</p>
      ) : (
        <ScenarioEditor
          key={row?.id ?? "new"}
          row={row}
          clientId={clientId}
          initial={
            parsed?.success
              ? parsed.data
              : { ...newScenario(new Date().toISOString().slice(0, 7)), ...q.data.seed }
          }
          diagnostic={q.data.diagnostic}
          metrics={q.data.metrics}
          onDirty={setDirty}
          onSaved={setSelected}
        />
      )}
    </div>
  );
}
function ScenarioEditor({
  row,
  clientId,
  initial,
  diagnostic,
  metrics,
  onDirty,
  onSaved,
}: {
  row: Tables<"marketing_scenarios"> | undefined;
  clientId: string;
  initial: Scenario;
  diagnostic:
    | {
        id: string;
        title: string | null;
        submitted_at: string | null;
        executive_summary: string | null;
        main_bottleneck: string | null;
      }
    | undefined;
  metrics: { metric_key: string; value: number; period_date: string }[];
  onDirty: (b: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState(0);
  const [historyPeriod, setHistoryPeriod] = useState(metrics[0]?.period_date ?? "");
  const [revision, setRevision] = useState(row?.updated_at);
  const [dirty, setDirty] = useState(false);
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const r = calculateScenario(s);
  function change(key: keyof Scenario, value: unknown) {
    setS((v) => ({ ...v, [key]: value }));
    setDirty(true);
    onDirty(true);
  }
  const save = useMutation({
    mutationFn: () =>
      saveScenario({
        data: { clientId, id: row?.id, updatedAt: revision, content: scenarioSchema.parse(s) },
      }),
    onSuccess: async (data) => {
      setRevision(data.updated_at);
      setDirty(false);
      onDirty(false);
      await qc.invalidateQueries({ queryKey: ["scenarios", clientId] });
      onSaved(data.id);
      toast.success("Cenário salvo. Ficará disponível para os próximos planos.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const number = (key: keyof Scenario, label: string, percent = false) => (
    <label className="block text-sm space-y-1">
      <span>{label}</span>
      <input
        className="input-base"
        type="number"
        min="0"
        max={percent ? 100 : 1e12}
        step="any"
        value={(s[key] as number) ?? ""}
        placeholder="Não informado"
        onChange={(e) => change(key, e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
  const text = (key: keyof Scenario, label: string) => (
    <label className="block text-sm space-y-1">
      <span>{label}</span>
      <textarea
        className="input-base min-h-20"
        value={String(s[key] ?? "")}
        onChange={(e) => change(key, e.target.value)}
        maxLength={4000}
      />
    </label>
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Receita adicional", money(r.gap), Target],
          ["Vendas adicionais", count(r.sales), Users],
          ["Verba necessária", money(r.neededBudget), Wallet],
          ["Limite por aquisição", money(r.cacLimit), Calculator],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Target;
          return (
            <section
              key={String(label)}
              className="surface-card p-5 border-t-4 border-t-violet-400"
            >
              <I className="h-5 w-5 text-violet-600 mb-3" />
              <p className="text-sm text-muted-foreground">{String(label)}</p>
              <strong className="block text-2xl mt-2">{String(value)}</strong>
            </section>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Etapas do cenário">
          {["1. Negócio", "2. Funil e premissas", "3. Teste e decisão"].map((v, i) => (
            <button
              key={v}
              role="tab"
              aria-selected={tab === i}
              className={tab === i ? "btn-primary" : "btn-outline"}
              onClick={() => setTab(i)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {dirty ? "Alterações não salvas" : row ? "Salvo" : "Novo cenário"}
          </span>
          {isAdmin && (
            <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              <Save className="h-4 w-4" />
              {save.isPending ? "Salvando…" : "Salvar cenário"}
            </button>
          )}
        </div>
      </div>
      {!row && diagnostic && (
        <p className="text-sm text-muted-foreground">
          Valores disponíveis trazidos de{" "}
          <Link className="underline" to="/diagnosticos/$id" params={{ id: diagnostic.id }}>
            {diagnostic.title || "Diagnóstico respondido"}
          </Link>
          . Confira o período e atualize antes de salvar.
        </p>
      )}
      <fieldset
        disabled={!isAdmin || save.isPending}
        className="surface-card p-6 space-y-5"
        role="tabpanel"
      >
        {tab === 0 && (
          <>
            <div>
              <h3 className="font-bold text-lg">O que precisa mudar neste mês?</h3>
              <p className="text-sm text-muted-foreground">
                Use valores do mesmo período. Campos vazios continuam como “a definir”.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <label className="block text-sm">
                Mês de referência
                <input
                  className="input-base mt-1"
                  type="month"
                  value={s.month}
                  onChange={(e) => change("month", e.target.value)}
                />
              </label>
              {number("revenue", "Faturamento mensal atual (R$)")}
              {number("target", "Meta mensal de faturamento (R$)")}
              {number("ticket", "Receita por venda / ticket (R$)")}
              {number("currentSales", "Vendas atuais no mês")}
              {number("extraCapacity", "Quantas vendas ADICIONAIS a operação atende?")}
              {number("budget", "Verba mensal para aquisição (R$)")}
            </div>
            {text("bottleneck", "O que limita o crescimento? (opcional)")}
            {metrics.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Usar números já registrados em Performance
                </summary>
                <div className="mt-3 flex flex-wrap gap-3 items-end">
                  <label className="text-sm">
                    Período
                    <select
                      className="input-base mt-1"
                      value={historyPeriod}
                      onChange={(e) => setHistoryPeriod(e.target.value)}
                    >
                      {[...new Set(metrics.map((m) => m.period_date))].map((date) => (
                        <option key={date} value={date}>
                          {date.split("-").reverse().join("/")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      const values: Partial<Scenario> = {};
                      const keys: Record<string, keyof Scenario> = {
                        faturamento: "revenue",
                        ticket_medio: "ticket",
                        cac: "expectedCac",
                      };
                      for (const m of metrics.filter((m) => m.period_date === historyPeriod)) {
                        const key = keys[m.metric_key];
                        if (key && Number.isFinite(m.value) && m.value >= 0)
                          Object.assign(values, { [key]: m.value });
                      }
                      if (!Object.keys(values).length) {
                        toast.info("Este período não tem faturamento, ticket ou CAC registrados.");
                        return;
                      }
                      setS((v) => ({
                        ...v,
                        ...values,
                        source: `Performance em ${historyPeriod}. Faturamento, ticket e/ou CAC trazidos dos registros; confira as demais premissas.`,
                        basis: "historico",
                      }));
                      setDirty(true);
                      onDirty(true);
                    }}
                  >
                    Usar faturamento, ticket e CAC do período
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Substitui apenas os valores disponíveis. Taxas de conversão permanecem para
                  revisão.
                </p>
              </details>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Consultar o diagnóstico
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm">
                {diagnostic?.executive_summary || "Sem resumo disponível."}
              </p>
            </details>
          </>
        )}
        {tab === 1 && (
          <>
            <h3 className="font-bold text-lg">Quais premissas sustentam a meta?</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm">
                Origem das estimativas
                <select
                  className="input-base mt-1"
                  value={s.basis}
                  onChange={(e) => change("basis", e.target.value)}
                >
                  <option value="hipotese">Hipótese para testar</option>
                  <option value="historico">Histórico do cliente</option>
                  <option value="referencia">Referência externa documentada</option>
                </select>
              </label>
              {text("source", "Fonte, período e observações das premissas")}
            </div>
            <label className="flex gap-2 text-sm items-center">
              <input
                type="checkbox"
                checked={s.usesMeetings}
                onChange={(e) => change("usesMeetings", e.target.checked)}
              />
              A venda passa por reunião comercial
            </label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {number("clickRate", "Alcance → clique (%)", true)}
              {number("leadRate", "Clique → contato (%)", true)}
              {s.usesMeetings && number("meetingRate", "Contato → reunião (%)", true)}
              {number(
                "saleRate",
                s.usesMeetings ? "Reunião → venda (%)" : "Contato → venda (%)",
                true,
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {number("expectedCac", "Custo ESTIMADO por aquisição (R$)")}
              {number("margin", "Margem de contribuição (%)", true)}
              {number("acquisitionShare", "Parcela da margem para aquisição (%)", true)}
            </div>
            <p className="text-xs text-muted-foreground">
              Limite por aquisição = ticket × margem × parcela destinada à aquisição. O custo
              estimado precisa vir do histórico ou de uma hipótese independente. Use a mesma
              composição de custos na verba e no custo por aquisição.
            </p>
          </>
        )}
        {tab === 2 && (
          <>
            <h3 className="font-bold text-lg">Testar antes de ampliar</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {text("hypothesis", "Hipótese do teste")}
              {text("success", "Qual resultado permite continuar ou ajustar?")}
              {number("testShare", "Parcela da verba no primeiro mês (%)", true)}
              {number("optimizeShare", "Parcela da verba no segundo mês (%)", true)}
              <label className="text-sm">
                Revisar resultados em
                <input
                  className="input-base mt-1"
                  type="date"
                  value={s.reviewDate}
                  onChange={(e) => change("reviewDate", e.target.value)}
                />
              </label>
            </div>
            <p className="text-sm">
              Teste: <strong>{money(r.testBudget)}</strong> · Próxima etapa:{" "}
              <strong>{money(r.optimizeBudget)}</strong>. Aumente o investimento apenas após avaliar
              os resultados.
            </p>
          </>
        )}
      </fieldset>
      <section className="rounded-2xl bg-slate-900 text-white p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold">Funil necessário para a receita adicional</h3>
          <p className="text-sm text-slate-300">
            Simulação mensal. Não equivale ao funil 5A medido nem a resultados observados.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ["Alcance", r.reach],
            ["Cliques", r.clicks],
            ["Contatos", r.leads],
            ...(s.usesMeetings ? [["Reuniões", r.meetings]] : []),
            ["Vendas", r.sales],
          ].map(([label, n]) => (
            <div key={String(label)} className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-slate-300">{String(label)}</p>
              <strong className="text-2xl">{count(n as number | null)}</strong>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-200">
          Com a verba e as premissas informadas: {count(r.feasibleSales)} vendas adicionais
          {s.extraCapacity == null
            ? " (capacidade ainda não informada)"
            : ", respeitando a capacidade informada"}
          . Receita mensal simulada: {money(r.projectedRevenue)}.
        </p>
      </section>
      {r.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2" role="status">
          {r.warnings.map((v) => (
            <p key={v} className="text-sm text-amber-950">
              {v}
            </p>
          ))}
        </div>
      )}
      <div className="surface-card p-5 flex flex-wrap justify-between gap-4 items-center">
        <p className="text-sm max-w-2xl">
          Salve o cenário para que ele seja considerado na próxima geração do plano. As metas
          continuam propostas; resultados reais são registrados em Performance.
        </p>
        <Link className="btn-outline" to="/plano-de-marketing/$clientId" params={{ clientId }}>
          Ir para o plano <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
