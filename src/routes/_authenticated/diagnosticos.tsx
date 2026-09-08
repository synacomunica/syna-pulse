import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { DIAGNOSTIC_STATUS_LABEL, PILLAR_LABEL } from "@/lib/pillars";
import { formatDate, formatScore } from "@/lib/format";
import { NewDiagnosticButton } from "@/components/new-diagnostic-button";

export const Route = createFileRoute("/_authenticated/diagnosticos")({
  head: () => ({
    meta: [
      { title: "Diagnósticos — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Todos os diagnósticos 4P + Performance, com status, nota geral e gargalo.",
      },
      { property: "og:title", content: "Diagnósticos — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Diagnósticos 4P + Performance da carteira Syna." },
    ],
  }),
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["diagnostics"],
    queryFn: async () => {
      const [diagnostics, clients] = await Promise.all([
        supabase.from("diagnostics").select("*").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, company_name"),
      ]);
      return { diagnostics: diagnostics.data ?? [], clients: clients.data ?? [] };
    },
  });

  const clientName = (cid: string) =>
    data?.clients.find((c) => c.id === cid)?.company_name ?? "Cliente";
  const list = (data?.diagnostics ?? []).filter((d) => !status || d.status === status);

  return (
    <AppShell
      title="Diagnósticos"
      subtitle="Da resposta do cliente à validação da equipe"
      actions={<NewDiagnosticButton label="Novo diagnóstico" />}
    >
      <select
        className="input-base w-auto"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">Todos os status</option>
        {Object.keys(DIAGNOSTIC_STATUS_LABEL).map((s) => (
          <option key={s} value={s}>
            {DIAGNOSTIC_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <div className="surface-card mt-5 divide-y divide-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            <p>Nenhum diagnóstico encontrado.</p>
            <p className="mt-1">
              Crie um formulário para um cliente e envie o link exclusivo. Assim que ele responder,
              o diagnóstico aparece aqui para análise.
            </p>
          </div>
        ) : (
          list.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <Link
                  to="/diagnosticos/$id"
                  params={{ id: d.id }}
                  className="font-semibold hover:text-primary"
                >
                  {clientName(d.client_id)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {DIAGNOSTIC_STATUS_LABEL[d.status]} · {formatDate(d.created_at)}
                  {d.main_bottleneck ? ` · Gargalo: ${PILLAR_LABEL[d.main_bottleneck]}` : ""}
                </p>
              </div>
              <span className="text-display text-xl">
                {d.overall_score != null ? formatScore(d.overall_score) : "—"}
              </span>
              <button
                className="btn-ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${window.location.origin}/d/${d.token}`);
                  toast.success("Link copiado.");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Link
              </button>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
