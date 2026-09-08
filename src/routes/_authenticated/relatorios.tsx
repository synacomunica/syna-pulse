import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PillarCard, type PillarScoreRow } from "@/components/pillar-matrix";
import { ScoreDial } from "@/components/score-badge";
import { FOUR_PS, PILLARS, PILLAR_LABEL, ACTION_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/pillars";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Relatório consolidado do diagnóstico: nota geral, matriz 4P e plano de ação.",
      },
      { property: "og:title", content: "Relatórios — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Relatório consolidado do diagnóstico do cliente." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const [diagId, setDiagId] = useState("");

  const { data: diagnostics = [] } = useQuery({
    queryKey: ["report-options"],
    queryFn: async () => {
      const [diags, clients] = await Promise.all([
        supabase.from("diagnostics").select("*").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, company_name"),
      ]);
      return (diags.data ?? []).map((d) => ({
        ...d,
        clientName: clients.data?.find((c) => c.id === d.client_id)?.company_name ?? "Cliente",
      }));
    },
  });

  const active = diagId || diagnostics[0]?.id || "";
  const diag = diagnostics.find((d) => d.id === active);

  const { data } = useQuery({
    queryKey: ["report", active],
    enabled: Boolean(active),
    queryFn: async () => {
      const [scores, actions] = await Promise.all([
        supabase.from("pillar_scores").select("*").eq("diagnostic_id", active),
        supabase.from("action_items").select("*").eq("diagnostic_id", active),
      ]);
      const rows = (scores.data ?? []) as unknown as PillarScoreRow[];
      return {
        scores: PILLARS.map((p) => rows.find((r) => r.pillar === p)).filter(
          Boolean,
        ) as PillarScoreRow[],
        actions: actions.data ?? [],
      };
    },
  });

  const fourP = (data?.scores ?? []).filter((s) => FOUR_PS.includes(s.pillar));
  const overall = fourP.length
    ? fourP.reduce((a, s) => a + Number(s.final_score ?? s.auto_score ?? 0), 0) / fourP.length
    : null;

  return (
    <AppShell
      title="Relatórios"
      subtitle="Documento estratégico para apresentar ao cliente"
      actions={
        <button className="btn-ghost" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Exportar PDF
        </button>
      }
    >
      {diagnostics.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Nenhum diagnóstico disponível.</p>
          <p className="mt-2">
            O relatório é gerado a partir de um diagnóstico respondido e analisado.
          </p>
          <Link to="/formularios" className="mt-4 inline-block font-medium text-primary">
            Criar formulário de diagnóstico
          </Link>
        </div>
      ) : (
        <>
          <select
            className="input-base w-auto print:hidden"
            value={active}
            onChange={(e) => setDiagId(e.target.value)}
          >
            {diagnostics.map((d) => (
              <option key={d.id} value={d.id}>
                {d.clientName} — {formatDate(d.created_at)}
              </option>
            ))}
          </select>

          <div className="print-area">
            <article className="surface-card mt-5 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Diagnóstico estratégico Syna
              </p>
              <h2 className="mt-2 text-3xl">{diag?.clientName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Emitido em {formatDate(new Date().toISOString())}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-10">
                <ScoreDial score={overall} size="lg" label="Nota geral 4P" />
                <div className="min-w-56 flex-1">
                  <h3 className="text-lg font-bold">Resumo executivo</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {diag?.executive_summary || "Análise ainda não gerada."}
                  </p>
                  {diag?.main_bottleneck ? (
                    <p className="mt-3 text-sm">
                      <span className="font-semibold">Principal gargalo:</span>{" "}
                      {PILLAR_LABEL[diag.main_bottleneck]}
                    </p>
                  ) : null}
                  {diag?.main_opportunity ? (
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">Principal oportunidade:</span>{" "}
                      {diag.main_opportunity}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {(data?.scores ?? []).map((s) => (
                <PillarCard key={s.pillar} score={s} />
              ))}
            </div>

            <section className="surface-card mt-5 p-6">
              <h3 className="text-lg font-bold">Plano de ação recomendado</h3>
              <div className="mt-4 divide-y divide-border">
                {(data?.actions ?? []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    Nenhuma ação vinculada a este diagnóstico.
                  </p>
                ) : (
                  data?.actions.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                      <span className="flex-1">{a.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {PRIORITY_LABEL[a.priority]} · {ACTION_STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="print-footer">
                Syna · Diagnóstico estratégico 4P + Performance · Não começar pelo canal. Começar
                pelo negócio.
              </p>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
