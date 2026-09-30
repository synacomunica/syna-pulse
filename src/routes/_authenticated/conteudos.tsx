import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { EditorialWorkspace } from "@/components/editorial-workspace";

export const Route = createFileRoute("/_authenticated/conteudos")({
  validateSearch: (s: Record<string, unknown>): { clientId?: string } =>
    typeof s["clientId"] === "string" ? { clientId: s["clientId"] } : {},
  component: ContentPage,
});
function ContentPage() {
  const search = Route.useSearch();
  const clientId = search.clientId ?? "";
  const navigate = Route.useNavigate();
  const clients = useQuery({
    queryKey: ["editorial-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,company_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });
  return (
    <AppShell title="Conteúdos" subtitle="Da direção do mês à análise dos resultados">
      <div className="space-y-5">
        <section className="surface-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Objetivo → mensagem → pauta → produção → publicação → análise
          </p>
          <label className="block text-sm font-medium">
            Cliente
            <select
              className="input-base"
              value={clientId}
              onChange={(e) => void navigate({ search: { clientId: e.target.value } })}
            >
              <option value="">Selecione um cliente</option>
              {clients.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </label>
          {clients.isError && (
            <p role="alert">
              Não foi possível carregar clientes.{" "}
              <button onClick={() => void clients.refetch()}>Tentar novamente</button>
            </p>
          )}
        </section>
        {clientId ? (
          <EditorialWorkspace key={clientId} clientId={clientId} />
        ) : (
          <p className="text-muted-foreground">
            Escolha um cliente para planejar ou acompanhar seu mês.{" "}
            <Link to="/plano-de-marketing" className="underline">
              Ver planos de marketing
            </Link>
          </p>
        )}
      </div>
    </AppShell>
  );
}
