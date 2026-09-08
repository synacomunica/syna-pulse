import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CLIENT_STATUS_LABEL } from "@/lib/pillars";
import { ClientDialog, clientPayload } from "@/components/client-dialog";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Cadastro e gestão da carteira de clientes da Syna com status e responsáveis.",
      },
      { property: "og:title", content: "Clientes — Syna Marketing Diagnostic" },
      {
        property: "og:description",
        content: "Carteira de clientes da Syna com status e responsáveis.",
      },
    ],
  }),
  component: ClientsPage,
});

const STATUSES = Object.keys(CLIENT_STATUS_LABEL);

function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null);
  const { isAdmin } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clients")
        .insert({
          ...clientPayload(payload),
          owner_id: userRes.user?.id ?? null,
          created_by: userRes.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const { error } = await supabase
        .from("clients")
        .update(clientPayload(payload))
        .eq("id", String(editing?.["id"]));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado.");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = clients.filter((c) => {
    const okSearch = `${c.company_name} ${c.trade_name ?? ""} ${c.segment ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const okStatus = !statusFilter || c.status === statusFilter;
    return okSearch && okStatus;
  });

  return (
    <AppShell
      title="Clientes"
      subtitle={`${clients.length} cadastrados`}
      actions={
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      }
    >
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-base pl-9"
            placeholder="Buscar por nome, segmento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-base w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="surface-card mt-5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Empresa</th>
              <th className="hidden px-5 py-3 font-semibold md:table-cell">Segmento</th>
              <th className="hidden px-5 py-3 font-semibold lg:table-cell">Cidade</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="hidden px-5 py-3 font-semibold sm:table-cell">Início</th>
              <th className="px-5 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="px-5 py-6 text-muted-foreground" colSpan={6}>
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-muted-foreground" colSpan={6}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-5 py-3.5">
                    <Link
                      to="/clientes/$id"
                      params={{ id: c.id }}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {c.company_name}
                    </Link>
                    {c.trade_name ? (
                      <p className="text-xs text-muted-foreground">{c.trade_name}</p>
                    ) : null}
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted-foreground md:table-cell">
                    {c.segment ?? "—"}
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted-foreground lg:table-cell">
                    {c.city ? `${c.city}${c.state ? `/${c.state}` : ""}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {CLIENT_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted-foreground sm:table-cell">
                    {formatDate(c.start_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn-ghost"
                        aria-label={`Editar ${c.company_name}`}
                        onClick={() => setEditing(c as unknown as Record<string, string | null>)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin ? (
                        <button
                          className="btn-ghost text-primary"
                          aria-label={`Excluir ${c.company_name}`}
                          disabled={remove.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                `Excluir ${c.company_name}? Diagnósticos, respostas e ações vinculadas também serão removidos.`,
                              )
                            )
                              remove.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <ClientDialog
          mode="create"
          onClose={() => setOpen(false)}
          onSubmit={(p) => create.mutate(p)}
          loading={create.isPending}
        />
      ) : null}

      {editing ? (
        <ClientDialog
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => update.mutate(p)}
          loading={update.isPending}
        />
      ) : null}
    </AppShell>
  );
}
