import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Grid2x2, LineChart, Target } from "lucide-react";
import { SynaLogo } from "@/components/syna-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syna Marketing Diagnostic — Diagnóstico estratégico 4P + Performance" },
      {
        name: "description",
        content:
          "Plataforma interna da Syna para diagnosticar clientes pelos 4 Ps do marketing, gerar notas, matriz visual, plano de ação e acompanhar performance.",
      },
      { property: "og:title", content: "Syna Marketing Diagnostic" },
      {
        property: "og:description",
        content:
          "Diagnóstico estratégico de marketing em 4P + Performance: notas, matriz visual, plano de ação e dashboards de resultado.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <SynaLogo />
        <Link
          to="/auth"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="pt-14 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Centro estratégico da Syna
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
            Não começar pelo canal.
            <br />
            <span className="text-primary">Começar pelo negócio.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Diagnóstico estratégico de marketing em 4P + Performance. Do formulário do cliente ao
            plano de ação, com notas, matriz visual e acompanhamento de resultado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Acessar plataforma <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Grid2x2,
              title: "Matriz 4P",
              text: "Produto, Preço, Praça e Promoção com nota, status, problemas e oportunidades.",
            },
            {
              icon: Target,
              title: "Plano de ação",
              text: "Do gargalo identificado às ações priorizadas em quadro Kanban.",
            },
            {
              icon: LineChart,
              title: "Performance",
              text: "Faturamento, leads, CAC, ROAS e metas acompanhados mês a mês.",
            },
          ].map((c) => (
            <div key={c.title} className="surface-card p-6">
              <c.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-lg font-bold">{c.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
