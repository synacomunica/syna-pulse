import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Stethoscope, ListChecks, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/score-badge";
import { DIAGNOSTIC_STATUS_LABEL, PILLAR_LABEL, FOUR_PS } from "@/lib/pillars";
import { formatDate, formatScore } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Visão geral de clientes, diagnósticos em andamento e gargalos mais frequentes.",
      },
      { property: "og:title", content: "Dashboard — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Visão geral de clientes e diagnósticos da Syna." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [clients, diagnostics, actions, scores] = await Promise.all([
        supabase.from("clients").select("id, company_name, status, created_at"),
        supabase
          .from("diagnostics")
          .select("id, title, status, overall_score, main_bottleneck, created_at, client_id")
          .order("created_at", { ascending: false }),
        supabase.from("action_items").select("id, status, priority, title, client_id, due_date"),
        supabase.from("pillar_scores").select("pillar, final_score"),
      ]);
      return {
        clients: clients.data ?? [],
        diagnostics: diagnostics.data ?? [],
        actions: actions.data ?? [],
        scores: scores.data ?? [],
      };
    },
  });

  const clients = data?.clients ?? [];
  const diagnostics = data?.diagnostics ?? [];
  const actions = data?.actions ?? [];
  const clientName = (id: string) => clients.find((c) => c.id === id)?.company_name ?? "Cliente";

  const pending = diagnostics.filter(
    (d) => d.status === "pendente" || d.status === "em_preenchimento",
  ).length;
  const openActions = actions.filter((a) => a.status !== "concluido").length;

  const pillarAvg = FOUR_PS.map((p) => {
    const list = (data?.scores ?? []).filter((s) => s.pillar === p && s.final_score != null);
    const avg = list.length
      ? list.reduce((a, s) => a + Number(s.final_score), 0) / list.length
      : null;
    return { pillar: p, avg };
  });
  const weakest = pillarAvg
    .filter((p) => p.avg != null)
    .sort((a, b) => Number(a.avg) - Number(b.avg))[0];

  return (
    <AppShell title="Dashboard" subtitle="Visão geral da operação estratégica da Syna">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Users} label="Clientes" value={clients.length} />
        <Kpi icon={Stethoscope} label="Diagnósticos" value={diagnostics.length} />
        <Kpi icon={AlertTriangle} label="Aguardando resposta" value={pending} />
        <Kpi icon={ListChecks} label="Ações em aberto" value={openActions} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Diagnósticos recentes</h2>
            <Link to="/diagnosticos" className="text-sm font-medium text-primary">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {isLoading ? (
              <p className="py-6 text-sm text-muted-foreground">Carregando...</p>
            ) : diagnostics.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nenhum diagnóstico ainda. Cadastre um cliente para começar.
              </p>
            ) : (
              diagnostics.slice(0, 6).map((d) => (
                <Link
                  key={d.id}
                  to="/diagnosticos/$id"
                  params={{ id: d.id }}
                  className="flex items-center gap-4 py-3.5 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{clientName(d.client_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {DIAGNOSTIC_STATUS_LABEL[d.status]} · {formatDate(d.created_at)}
                    </p>
                  </div>
                  {d.main_bottleneck ? (
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      Gargalo: {PILLAR_LABEL[d.main_bottleneck]}
                    </span>
                  ) : null}
                  {d.overall_score != null ? (
                    <span className="text-display text-lg">{formatScore(d.overall_score)}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Média por pilar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Todos os diagnósticos analisados</p>
          <div className="mt-5 space-y-4">
            {pillarAvg.map((p) => (
              <div key={p.pillar}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{PILLAR_LABEL[p.pillar]}</span>
                  <span className="text-display">{formatScore(p.avg)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${((p.avg ?? 0) / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {weakest ? (
            <div className="mt-6 rounded-lg bg-muted p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Gargalo mais comum
              </p>
              <p className="mt-1 text-display text-lg">{PILLAR_LABEL[weakest.pillar]}</p>
              <StatusBadge score={weakest.avg} className="mt-2" />
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-display text-3xl">{value}</p>
    </div>
  );
}
