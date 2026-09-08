import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { METRICS, metricDef } from "@/lib/pillars";
import { formatMetric, monthLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Performance — Syna Marketing Diagnostic" },
      {
        name: "description",
        content:
          "Indicadores de resultado por cliente: faturamento, leads, CAC, ROAS, conversão e metas.",
      },
      { property: "og:title", content: "Performance — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Indicadores de resultado e metas por cliente." },
    ],
  }),
  component: Performance,
});

function Performance() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [metricKey, setMetricKey] = useState("faturamento");
  const [open, setOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, company_name")
        .order("company_name");
      return data ?? [];
    },
  });

  const activeClient = clientId || clients[0]?.id || "";

  const { data } = useQuery({
    queryKey: ["performance", activeClient],
    enabled: Boolean(activeClient),
    queryFn: async () => {
      const [values, goals] = await Promise.all([
        supabase
          .from("metric_values")
          .select("*")
          .eq("client_id", activeClient)
          .order("period_date"),
        supabase.from("goals").select("*").eq("client_id", activeClient),
      ]);
      return { values: values.data ?? [], goals: goals.data ?? [] };
    },
  });

  const addValue = useMutation({
    mutationFn: async (p: Record<string, string>) => {
      const { error } = await supabase.from("metric_values").insert({
        client_id: activeClient,
        metric_key: p["metric_key"]!,
        period_date: `${p["period"]}-01`,
        value: Number(p["value"]),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indicador registrado.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["performance", activeClient] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeValue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metric_values").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído.");
      void qc.invalidateQueries({ queryKey: ["performance", activeClient] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveGoal = useMutation({
    mutationFn: async (p: Record<string, string>) => {
      const metric = p["metric_key"]!;
      await supabase.from("goals").delete().eq("client_id", activeClient).eq("metric_key", metric);
      const { error } = await supabase.from("goals").insert({
        client_id: activeClient,
        metric_key: metric,
        target_value: Number(p["target_value"]),
        period_start: p["period_start"] ? `${p["period_start"]}-01` : null,
        period_end: p["period_end"] ? `${p["period_end"]}-01` : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta definida.");
      setGoalOpen(false);
      void qc.invalidateQueries({ queryKey: ["performance", activeClient] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const series = useMemo(
    () =>
      (data?.values ?? [])
        .filter((v) => v.metric_key === metricKey)
        .map((v) => ({ mes: monthLabel(v.period_date), valor: Number(v.value) })),
    [data, metricKey],
  );

  const latestByMetric = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of data?.values ?? []) map.set(v.metric_key, Number(v.value));
    return map;
  }, [data]);

  return (
    <AppShell
      title="Performance"
      subtitle="Resultado do negócio, não vaidade de canal"
      actions={
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setGoalOpen(true)} disabled={!activeClient}>
            <Target className="h-4 w-4" /> Definir meta
          </button>
          <button className="btn-primary" onClick={() => setOpen(true)} disabled={!activeClient}>
            <Plus className="h-4 w-4" /> Registrar indicador
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-3">
        <select
          className="input-base w-auto"
          value={activeClient}
          onChange={(e) => setClientId(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
        <select
          className="input-base w-auto"
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.slice(0, 8).map((m) => {
          const goal = data?.goals.find((g) => g.metric_key === m.key);
          const value = latestByMetric.get(m.key) ?? null;
          return (
            <div key={m.key} className="surface-card p-5">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className="mt-2 text-display text-2xl">
                {value == null ? "—" : formatMetric(value, m.format)}
              </p>
              {goal ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Meta: {formatMetric(Number(goal.target_value), m.format)}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((value ?? 0) / Number(goal.target_value || 1)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-lg font-bold">{metricDef(metricKey).label} ao longo do tempo</h2>
        {series.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum registro para este indicador ainda.
          </p>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => formatMetric(v, metricDef(metricKey).format)}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="text-lg font-bold">Registros deste cliente</h2>
        {(data?.values ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum indicador registrado ainda. Use “Registrar indicador” para lançar o primeiro
            valor.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Mês</th>
                  <th className="pb-2">Indicador</th>
                  <th className="pb-2">Valor</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {[...(data?.values ?? [])].reverse().map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-2">{monthLabel(v.period_date)}</td>
                    <td className="py-2">{metricDef(v.metric_key).label}</td>
                    <td className="py-2">
                      {formatMetric(Number(v.value), metricDef(v.metric_key).format)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        aria-label="Excluir registro"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        onClick={() => {
                          if (confirm("Excluir este registro?")) removeValue.mutate(v.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <form
            className="surface-card w-full max-w-sm p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const obj: Record<string, string> = {};
              fd.forEach((v, k) => (obj[k] = String(v)));
              addValue.mutate(obj);
            }}
          >
            <h2 className="text-lg font-bold">Registrar indicador</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Indicador</span>
                <select className="input-base" name="metric_key" defaultValue={metricKey}>
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Mês de referência</span>
                <input className="input-base" name="period" type="month" required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Valor</span>
                <input className="input-base" name="value" type="number" step="0.01" required />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={addValue.isPending}>
                Salvar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {goalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <form
            className="surface-card w-full max-w-sm p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const obj: Record<string, string> = {};
              fd.forEach((v, k) => (obj[k] = String(v)));
              saveGoal.mutate(obj);
            }}
          >
            <h2 className="text-lg font-bold">Definir meta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Uma meta por indicador. Definir novamente substitui a anterior.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Indicador</span>
                <select className="input-base" name="metric_key" defaultValue={metricKey}>
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Valor da meta</span>
                <input
                  className="input-base"
                  name="target_value"
                  type="number"
                  step="0.01"
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Início</span>
                  <input className="input-base" name="period_start" type="month" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Fim</span>
                  <input className="input-base" name="period_end" type="month" />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setGoalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saveGoal.isPending}>
                Salvar meta
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
