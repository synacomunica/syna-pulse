import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ACTION_STATUS_LABEL, PILLARS, PILLAR_LABEL, PRIORITY_LABEL } from "@/lib/pillars";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plano-de-acao")({
  head: () => ({
    meta: [
      { title: "Plano de Ação — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Quadro Kanban das ações estratégicas por cliente, pilar, prioridade e prazo.",
      },
      { property: "og:title", content: "Plano de Ação — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Kanban das ações estratégicas por cliente e pilar." },
    ],
  }),
  component: ActionPlan,
});

const COLUMNS = ["backlog", "planejado", "em_andamento", "concluido"] as const;

type ActionRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  pillar: string | null;
  priority: string;
  due_date: string | null;
  owner_name: string | null;
  expected_result: string | null;
  status: string;
};

function ActionPlan() {
  const qc = useQueryClient();
  const [clientFilter, setClientFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActionRow | null>(null);

  const { data } = useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const [actions, clients] = await Promise.all([
        supabase.from("action_items").select("*").order("position"),
        supabase.from("clients").select("id, company_name").order("company_name"),
      ]);
      return { actions: actions.data ?? [], clients: clients.data ?? [] };
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("action_items")
        .update({ status: status as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["actions"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async (p: Record<string, string>) => {
      const payload = {
        client_id: p["client_id"]!,
        title: p["title"]!,
        description: p["description"] || null,
        pillar: (p["pillar"] || null) as never,
        priority: (p["priority"] || "media") as never,
        due_date: p["due_date"] || null,
        owner_name: p["owner_name"] || null,
        expected_result: p["expected_result"] || null,
      };
      const { error } = editing
        ? await supabase.from("action_items").update(payload).eq("id", editing.id)
        : await supabase.from("action_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Ação atualizada." : "Ação criada.");
      setOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("action_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação excluída.");
      void qc.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clients = data?.clients ?? [];
  const actions = (data?.actions ?? []).filter(
    (a) => !clientFilter || a.client_id === clientFilter,
  );
  const clientName = (id: string) => clients.find((c) => c.id === id)?.company_name ?? "—";

  return (
    <AppShell
      title="Plano de Ação"
      subtitle="Do gargalo à execução"
      actions={
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova ação
        </button>
      }
    >
      <select
        className="input-base w-auto"
        value={clientFilter}
        onChange={(e) => setClientFilter(e.target.value)}
      >
        <option value="">Todos os clientes</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.company_name}
          </option>
        ))}
      </select>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = actions.filter((a) => a.status === col);
          return (
            <div key={col} className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-center justify-between px-1 pb-3">
                <h2 className="text-sm font-bold">{ACTION_STATUS_LABEL[col]}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((a) => (
                  <article key={a.id} className="surface-card p-4">
                    <p className="text-sm font-semibold leading-snug">{a.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{clientName(a.client_id)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-full border border-border bg-background px-2 py-0.5">
                        {PRIORITY_LABEL[a.priority]}
                      </span>
                      {a.pillar ? (
                        <span className="rounded-full border border-border bg-background px-2 py-0.5">
                          {PILLAR_LABEL[a.pillar]}
                        </span>
                      ) : null}
                      {a.due_date ? (
                        <span className="text-muted-foreground">{formatDate(a.due_date)}</span>
                      ) : null}
                    </div>
                    <select
                      className="input-base mt-3 py-1.5 text-xs"
                      value={a.status}
                      onChange={(e) => move.mutate({ id: a.id, status: e.target.value })}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c} value={c}>
                          {ACTION_STATUS_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Editar ação"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setEditing(a as ActionRow);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir ação"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir a ação "${a.title}"?`)) remove.mutate(a.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
                {items.length === 0 ? (
                  <p className="px-1 py-4 text-xs text-muted-foreground">Nenhuma ação.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4">
          <form
            key={editing?.id ?? "new"}
            className="surface-card w-full max-w-lg p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const obj: Record<string, string> = {};
              fd.forEach((v, k) => (obj[k] = String(v)));
              create.mutate(obj);
            }}
          >
            <h2 className="text-lg font-bold">{editing ? "Editar ação" : "Nova ação"}</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Cliente</span>
                <select
                  className="input-base"
                  name="client_id"
                  required
                  defaultValue={editing?.client_id ?? ""}
                >
                  <option value="">Selecione...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Ação</span>
                <input
                  className="input-base"
                  name="title"
                  required
                  defaultValue={editing?.title ?? ""}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Descrição</span>
                <textarea
                  className="input-base"
                  name="description"
                  rows={3}
                  defaultValue={editing?.description ?? ""}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Pilar</span>
                  <select className="input-base" name="pillar" defaultValue={editing?.pillar ?? ""}>
                    <option value="">—</option>
                    {PILLARS.map((p) => (
                      <option key={p} value={p}>
                        {PILLAR_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Prioridade</span>
                  <select
                    className="input-base"
                    name="priority"
                    defaultValue={editing?.priority ?? "media"}
                  >
                    {Object.keys(PRIORITY_LABEL).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Responsável</span>
                  <input
                    className="input-base"
                    name="owner_name"
                    defaultValue={editing?.owner_name ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Prazo</span>
                  <input
                    className="input-base"
                    name="due_date"
                    type="date"
                    defaultValue={editing?.due_date ?? ""}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Resultado esperado</span>
                <input
                  className="input-base"
                  name="expected_result"
                  defaultValue={editing?.expected_result ?? ""}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={create.isPending}>
                {editing ? "Salvar alterações" : "Criar ação"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
