import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Printer } from "lucide-react";
import { getPublicReport } from "@/lib/diagnostic.functions";
import { SynaLogo } from "@/components/syna-logo";
import { ScoreDial } from "@/components/score-badge";
import { PILLAR_LABEL, ACTION_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/pillars";
import type { Pillar } from "@/lib/questions";
import { formatDate, formatScore } from "@/lib/format";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "Seu diagnóstico estratégico — Syna" },
      {
        name: "description",
        content:
          "Relatório do diagnóstico 4P + Performance da sua empresa, elaborado pela equipe Syna.",
      },
      { property: "og:title", content: "Seu diagnóstico estratégico — Syna" },
      {
        property: "og:description",
        content: "Relatório 4P + Performance com notas, oportunidades e plano de ação.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientReport,
});

type Report = Awaited<ReturnType<typeof getPublicReport>>;

function ClientReport() {
  const { token } = Route.useParams();
  const load = useServerFn(getPublicReport);
  const [report, setReport] = useState<Report>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    load({ data: { token } })
      .then((r) => {
        setReport(r);
        setState(r ? "ready" : "unavailable");
      })
      .catch(() => setState("unavailable"));
  }, [load, token]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "unavailable" || !report) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Relatório indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este relatório ainda não foi liberado pela equipe Syna ou o link não é válido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <SynaLogo showSub={false} />
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Salvar em PDF
          </button>
        </div>
      </header>

      <main className="print-area mx-auto max-w-4xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Diagnóstico estratégico Syna
        </p>
        <h1 className="mt-2 text-3xl">{report.companyName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validado em {formatDate(report.validatedAt ?? report.createdAt)}
        </p>

        <section className="surface-card mt-8 flex flex-wrap items-center gap-10 p-7">
          <ScoreDial score={report.overallScore} size="lg" label="Nota geral 4P" />
          <div className="min-w-56 flex-1">
            <h2 className="text-lg font-bold">Resumo executivo</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {report.executiveSummary || "—"}
            </p>
            {report.mainBottleneck ? (
              <p className="mt-3 text-sm">
                <span className="font-semibold">Principal gargalo:</span>{" "}
                {PILLAR_LABEL[report.mainBottleneck as Pillar] ?? report.mainBottleneck}
              </p>
            ) : null}
            {report.mainOpportunity ? (
              <p className="mt-1 text-sm">
                <span className="font-semibold">Principal oportunidade:</span>{" "}
                {report.mainOpportunity}
              </p>
            ) : null}
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {report.scores.map((s) => (
            <article key={s.pillar} className="surface-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {PILLAR_LABEL[s.pillar as Pillar] ?? s.pillar}
                </h3>
                <span className="text-display text-2xl">
                  {s.score == null ? "—" : formatScore(s.score)}
                </span>
              </div>
              {s.summary ? <p className="mt-2 text-sm text-muted-foreground">{s.summary}</p> : null}
              <ListBlock title="Pontos fortes" items={s.strengths} />
              <ListBlock title="Problemas" items={s.problems} />
              <ListBlock title="Riscos" items={s.risks} />
              <ListBlock title="Oportunidades" items={s.opportunities} />
            </article>
          ))}
        </div>

        <section className="surface-card mt-6 p-6">
          <h2 className="text-lg font-bold">Plano de ação</h2>
          <div className="mt-3 divide-y divide-border">
            {report.actions.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                O plano de ação será apresentado pela equipe Syna.
              </p>
            ) : (
              report.actions.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="flex-1">{a.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {PRIORITY_LABEL[a.priority] ?? a.priority} ·{" "}
                    {ACTION_STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
