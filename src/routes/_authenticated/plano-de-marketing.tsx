import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/_authenticated/plano-de-marketing")({ component: Plans });
function Plans() {
  const location = useLocation();
  const query = useQuery({
    queryKey: ["marketing-plan-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,company_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });
  if (location.pathname.replace(/\/$/, "") !== "/plano-de-marketing") return <Outlet />;
  return (
    <AppShell
      title="Plano de Marketing"
      subtitle="Do diagnóstico validado à execução e aos resultados"
    >
      {query.isPending && <p>Carregando clientes…</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.map((client) => (
          <Link
            key={client.id}
            className="surface-card p-5 hover:border-primary"
            to="/plano-de-marketing/$clientId"
            params={{ clientId: client.id }}
          >
            <h2 className="font-bold">{client.company_name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Abrir plano, versões e execução →</p>
          </Link>
        ))}
      </div>
      {query.data?.length === 0 && (
        <p>Cadastre um cliente e valide seu diagnóstico para começar.</p>
      )}
    </AppShell>
  );
}
