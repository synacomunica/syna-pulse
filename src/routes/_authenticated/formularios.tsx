import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { DIAGNOSTIC_STATUS_LABEL } from "@/lib/pillars";
import { STEPS } from "@/lib/questions";
import { formatDate } from "@/lib/format";
import { NewDiagnosticButton } from "@/components/new-diagnostic-button";

export const Route = createFileRoute("/_authenticated/formularios")({
  head: () => ({
    meta: [
      { title: "Formulários — Syna Marketing Diagnostic" },
      {
        name: "description",
        content:
          "Links exclusivos de diagnóstico enviados aos clientes e progresso de preenchimento.",
      },
      { property: "og:title", content: "Formulários — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Links exclusivos e progresso de preenchimento." },
    ],
  }),
  component: Forms,
});

function Forms() {
  const { data } = useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const [diagnostics, clients] = await Promise.all([
        supabase
          .from("diagnostics")
          .select("id, token, status, current_step, created_at, submitted_at, client_id")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id, company_name"),
      ]);
      return { diagnostics: diagnostics.data ?? [], clients: clients.data ?? [] };
    },
  });

  const clientName = (id: string) =>
    data?.clients.find((c) => c.id === id)?.company_name ?? "Cliente";

  return (
    <AppShell
      title="Formulários"
      subtitle="Links exclusivos e progresso de preenchimento"
      actions={<NewDiagnosticButton />}
    >
      <div className="surface-card divide-y divide-border">
        {(data?.diagnostics ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nenhum formulário. Crie um diagnóstico na ficha do cliente.
          </p>
        ) : (
          data?.diagnostics.map((d) => {
            const pct = Math.round(((d.current_step + 1) / STEPS.length) * 100);
            const url = `/d/${d.token}`;
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/diagnosticos/$id"
                    params={{ id: d.id }}
                    className="text-sm font-semibold hover:text-primary"
                  >
                    {clientName(d.client_id)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {DIAGNOSTIC_STATUS_LABEL[d.status]} ·{" "}
                    {d.submitted_at
                      ? `enviado em ${formatDate(d.submitted_at)}`
                      : `criado em ${formatDate(d.created_at)}`}
                  </p>
                </div>
                <div className="w-40">
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${d.submitted_at ? 100 : pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {d.submitted_at ? "Concluído" : `Etapa ${d.current_step + 1}/${STEPS.length}`}
                  </p>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    void navigator.clipboard?.writeText(`${window.location.origin}${url}`);
                    toast.success("Link copiado.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
                <a className="btn-ghost" href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </a>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
