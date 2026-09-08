import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CLIENT_STATUS_LABEL, DIAGNOSTIC_STATUS_LABEL, ACTION_STATUS_LABEL } from "@/lib/pillars";
import { formatDate, formatScore } from "@/lib/format";
import { ClientDialog, clientPayload } from "@/components/client-dialog";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Dados cadastrais, diagnósticos e ações estratégicas do cliente.",
      },
      { property: "og:title", content: "Ficha do cliente — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Dados, diagnósticos e ações do cliente." },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [client, diagnostics, actions] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("diagnostics")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("action_items").select("*").eq("client_id", id),
      ]);
      return {
        client: client.data,
        diagnostics: diagnostics.data ?? [],
        actions: actions.data ?? [],
      };
    },
  });

  const createDiagnostic = useMutation({
    mutationFn: async () => {
      const { data: d, error } = await supabase
        .from("diagnostics")
        .insert({
          client_id: id,
          title: `Diagnóstico ${new Date().toLocaleDateString("pt-BR")}`,
        })
        .select("id, token")
        .single();
      if (error) throw error;
      await supabase.from("clients").update({ status: "diagnostico_pendente" }).eq("id", id);
      return d;
    },
    onSuccess: (d) => {
      const url = `${window.location.origin}/d/${d.token}`;
      void navigator.clipboard?.writeText(url);
      toast.success("Diagnóstico criado. Link copiado para a área de transferência.");
      void qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const { error } = await supabase.from("clients").update(clientPayload(payload)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado.");
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["client", id] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void navigate({ to: "/clientes" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const client = data?.client;

  return (
    <AppShell
      title={client?.company_name ?? "Cliente"}
      subtitle={client ? CLIENT_STATUS_LABEL[client.status] : undefined}
      actions={
        <>
          <Link className="btn-ghost" to="/plano-de-marketing/$clientId" params={{ clientId: id }}>
            Plano de Marketing
          </Link>
          <button className="btn-ghost" onClick={() => setEditing(true)} disabled={!client}>
            <Pencil className="h-4 w-4" /> Editar cliente
          </button>
          <button
            className="btn-primary"
            onClick={() => createDiagnostic.mutate()}
            disabled={createDiagnostic.isPending}
          >
            <Plus className="h-4 w-4" /> Novo formulário
          </button>
          {isAdmin ? (
            <button
              className="btn-ghost text-primary"
              disabled={remove.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Excluir este cliente? Diagnósticos, respostas e ações vinculadas também serão removidos.",
                  )
                )
                  remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !client ? (
        <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface-card p-6 lg:col-span-1">
            <h2 className="text-lg font-bold">Cadastro</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Nome fantasia" value={client.trade_name} />
              <Row label="Segmento" value={client.segment} />
              <Row label="Categoria" value={client.category} />
              <Row label="CNPJ" value={client.cnpj} />
              <Row
                label="Localização"
                value={
                  client.city ? `${client.city}${client.state ? `/${client.state}` : ""}` : null
                }
              />
              <Row label="Site" value={client.website} />
              <Row label="Instagram" value={client.instagram} />
              <Row label="WhatsApp" value={client.whatsapp} />
              <Row label="Contato" value={client.contact_name} />
              <Row label="Cargo" value={client.contact_role} />
              <Row label="E-mail" value={client.email} />
              <Row label="Telefone" value={client.phone} />
              <Row label="Início" value={formatDate(client.start_date)} />
            </dl>
            {client.notes ? (
              <p className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                {client.notes}
              </p>
            ) : null}
          </section>

          <div className="space-y-6 lg:col-span-2">
            <section className="surface-card p-6">
              <h2 className="text-lg font-bold">Diagnósticos</h2>
              <div className="mt-4 divide-y divide-border">
                {data.diagnostics.length === 0 ? (
                  <p className="py-5 text-sm text-muted-foreground">
                    Nenhum diagnóstico. Crie um para gerar o link exclusivo do cliente.
                  </p>
                ) : (
                  data.diagnostics.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/diagnosticos/$id"
                          params={{ id: d.id }}
                          className="text-sm font-semibold hover:text-primary"
                        >
                          {d.title ?? "Diagnóstico"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {DIAGNOSTIC_STATUS_LABEL[d.status]} · criado em {formatDate(d.created_at)}
                        </p>
                      </div>
                      <span className="text-display text-lg">
                        {d.overall_score != null ? formatScore(d.overall_score) : "—"}
                      </span>
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          void navigator.clipboard?.writeText(
                            `${window.location.origin}/d/${d.token}`,
                          );
                          toast.success("Link do formulário copiado.");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> Link
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="surface-card p-6">
              <h2 className="text-lg font-bold">Plano de ação</h2>
              <div className="mt-4 divide-y divide-border">
                {data.actions.length === 0 ? (
                  <p className="py-5 text-sm text-muted-foreground">
                    Nenhuma ação cadastrada para este cliente.
                  </p>
                ) : (
                  data.actions.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-3">
                      <span className="flex-1 text-sm">{a.title}</span>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
                        {ACTION_STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Link
                to="/plano-de-acao"
                className="mt-4 inline-block text-sm font-medium text-primary"
              >
                Abrir quadro completo
              </Link>
            </section>
          </div>
        </div>
      )}

      {editing && client ? (
        <ClientDialog
          mode="edit"
          initial={client as unknown as Record<string, string | null>}
          onClose={() => setEditing(false)}
          onSubmit={(p) => update.mutate(p)}
          loading={update.isPending}
        />
      ) : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
