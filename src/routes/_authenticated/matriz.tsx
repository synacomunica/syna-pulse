import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PillarCard, PillarRadar, type PillarScoreRow } from "@/components/pillar-matrix";
import { PILLARS } from "@/lib/pillars";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/matriz")({
  head: () => ({
    meta: [
      { title: "Matriz 4P — Syna Marketing Diagnostic" },
      {
        name: "description",
        content:
          "Matriz visual de Produto, Preço, Praça e Promoção com notas, riscos e oportunidades.",
      },
      { property: "og:title", content: "Matriz 4P — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Matriz visual dos 4 Ps com notas e oportunidades." },
    ],
  }),
  component: MatrixPage,
});

function MatrixPage() {
  const [diagId, setDiagId] = useState("");

  const { data: options = [] } = useQuery({
    queryKey: ["matrix-options"],
    queryFn: async () => {
      const [diags, clients] = await Promise.all([
        supabase
          .from("diagnostics")
          .select("id, client_id, created_at, overall_score")
          .not("overall_score", "is", null)
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id, company_name"),
      ]);
      return (diags.data ?? []).map((d) => ({
        id: d.id,
        label: `${clients.data?.find((c) => c.id === d.client_id)?.company_name ?? "Cliente"} — ${formatDate(d.created_at)}`,
      }));
    },
  });

  const active = diagId || options[0]?.id || "";

  const { data: scores = [] } = useQuery({
    queryKey: ["matrix", active],
    enabled: Boolean(active),
    queryFn: async () => {
      const { data } = await supabase.from("pillar_scores").select("*").eq("diagnostic_id", active);
      const rows = (data ?? []) as unknown as PillarScoreRow[];
      return PILLARS.map((p) => rows.find((r) => r.pillar === p)).filter(
        Boolean,
      ) as PillarScoreRow[];
    },
  });

  return (
    <AppShell title="Matriz 4P" subtitle="Produto, Preço, Praça e Promoção + Performance">
      {options.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Nenhum diagnóstico analisado ainda.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Cadastre o cliente em Clientes.</li>
            <li>Crie o formulário e envie o link exclusivo.</li>
            <li>Com as respostas enviadas, rode a análise na ficha do diagnóstico.</li>
          </ol>
          <Link to="/formularios" className="mt-4 inline-block font-medium text-primary">
            Ir para Formulários
          </Link>
        </div>
      ) : (
        <>
          <select
            className="input-base w-auto"
            value={active}
            onChange={(e) => setDiagId(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          {scores.length ? (
            <section className="surface-card mt-5 p-6">
              <PillarRadar scores={scores} />
            </section>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {scores.map((s) => (
              <PillarCard key={s.pillar} score={s} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
