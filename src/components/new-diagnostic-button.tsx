import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function NewDiagnosticButton({ label = "Novo formulário" }: { label?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, company_name")
        .order("company_name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("diagnostics")
        .insert({ client_id: id, title: `Diagnóstico ${new Date().toLocaleDateString("pt-BR")}` })
        .select("id, token")
        .single();
      if (error) throw error;
      await supabase.from("clients").update({ status: "diagnostico_pendente" }).eq("id", id);
      return data;
    },
    onSuccess: (d) => {
      void navigator.clipboard?.writeText(`${window.location.origin}/d/${d.token}`);
      toast.success("Formulário criado. Link exclusivo copiado.");
      setOpen(false);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="surface-card w-full max-w-md p-6">
            <h2 className="text-xl font-bold">Novo formulário de diagnóstico</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o cliente. O link exclusivo é gerado e copiado automaticamente.
            </p>
            {clients.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Cadastre um cliente antes de criar um formulário.
              </p>
            ) : (
              <select
                className="input-base mt-5"
                value={clientId || clients[0]?.id || ""}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                disabled={clients.length === 0 || create.isPending}
                onClick={() => create.mutate(clientId || clients[0]!.id)}
              >
                {create.isPending ? "Criando..." : "Criar e copiar link"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
