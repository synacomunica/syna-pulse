import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, CheckCircle2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeDiagnostic } from "@/lib/diagnostic.functions";
import { AppShell } from "@/components/app-shell";
import { ScoreDial } from "@/components/score-badge";
import { PillarCard, PillarRadar, type PillarScoreRow } from "@/components/pillar-matrix";
import { DIAGNOSTIC_STATUS_LABEL, PILLARS, PILLAR_LABEL, FOUR_PS } from "@/lib/pillars";
import { STEPS, isVisible } from "@/lib/questions";
import { formatDate, formatScore } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/diagnosticos/$id")({
  head: () => ({
    meta: [
      { title: "Diagnóstico — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Análise 4P + Performance com notas, matriz, respostas do cliente e validação.",
      },
      { property: "og:title", content: "Diagnóstico — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Análise 4P + Performance com notas e matriz." },
    ],
  }),
  component: DiagnosticDetail,
});

type Tab = "geral" | "matriz" | "respostas";

function DiagnosticDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeDiagnostic);
  const [tab, setTab] = useState<Tab>("geral");
  const [editing, setEditing] = useState<PillarScoreRow | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const {
    data,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["diagnostic", id],
    queryFn: async () => {
      const { data: diag, error } = await supabase
        .from("diagnostics")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!diag) return null;
      const [client, scores, answers] = await Promise.all([
        supabase.from("clients").select("*").eq("id", diag.client_id).maybeSingle(),
        supabase.from("pillar_scores").select("*").eq("diagnostic_id", id),
        supabase.from("answers").select("question_key, value").eq("diagnostic_id", id),
      ]);
      for (const result of [client, scores, answers]) if (result.error) throw result.error;
      const answerMap: Record<string, unknown> = {};
      for (const a of answers.data ?? []) answerMap[a.question_key] = a.value;
      return {
        diag,
        client: client.data,
        scores: (scores.data ?? []) as unknown as PillarScoreRow[],
        answers: answerMap,
      };
    },
  });

  const runAnalysis = useMutation({
    mutationFn: () => analyze({ data: { diagnosticId: id } }),
    onSuccess: (res) => {
      if (res.warning) toast.warning(res.warning);
      else toast.success(`Análise concluída. Gargalo: ${res.bottleneck}.`);
      void qc.invalidateQueries({ queryKey: ["diagnostic", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validate = useMutation({
    mutationFn: async () => {
      if (
        !data?.diag.submitted_at ||
        !data.diag.analyzed_at ||
        !FOUR_PS.every((p) =>
          data.scores.some((s) => s.pillar === p && (s.final_score ?? s.auto_score) != null),
        )
      )
        throw new Error("Conclua o formulário e a análise dos quatro Ps antes de validar.");
      const { data: u, error: authError } = await supabase.auth.getUser();
      if (authError || !u.user) throw new Error("Sua sessão expirou. Entre novamente.");
      const { data: updated, error } = await supabase
        .from("diagnostics")
        .update({
          status: "validado",
          validated_at: new Date().toISOString(),
          validated_by: u.user?.id ?? null,
        })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      if (!updated) throw new Error("Não foi possível validar o diagnóstico.");
      if (data?.diag.client_id) {
        await supabase
          .from("clients")
          .update({ status: "cliente_ativo" })
          .eq("id", data.diag.client_id);
      }
    },
    onSuccess: () => {
      toast.success("Diagnóstico validado. Você já pode gerar o plano de marketing.");
      void qc.invalidateQueries({ queryKey: ["diagnostic", id] });
      void qc.invalidateQueries({ queryKey: ["diagnostics"] });
      void qc.invalidateQueries({ queryKey: ["plan-diagnostics"] });
    },
  });

  const saveScore = useMutation({
    mutationFn: async (payload: { pillar: string; score: number; reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("pillar_scores")
        .update({
          final_score: payload.score,
          change_reason: payload.reason,
          changed_by: u.user?.id ?? null,
          changed_at: new Date().toISOString(),
        })
        .eq("diagnostic_id", id)
        .eq("pillar", payload.pillar as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota atualizada.");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["diagnostic", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDiagnostic = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("diagnostics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diagnóstico excluído.");
      void qc.invalidateQueries({ queryKey: ["diagnostics"] });
      void navigate({ to: "/diagnosticos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell title="Diagnóstico">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }
  if (loadError)
    return (
      <AppShell title="Diagnóstico">
        <p role="alert">{loadError.message}</p>
      </AppShell>
    );
  if (!data) {
    return (
      <AppShell title="Diagnóstico">
        <p className="text-sm text-muted-foreground">Diagnóstico não encontrado.</p>
      </AppShell>
    );
  }

  const { diag, client, scores, answers } = data;
  const ordered = PILLARS.map((p) => scores.find((s) => s.pillar === p)).filter(
    Boolean,
  ) as PillarScoreRow[];
  const fourP = ordered.filter((s) => FOUR_PS.includes(s.pillar));
  const overall = fourP.length
    ? fourP.reduce((a, s) => a + Number(s.final_score ?? s.auto_score ?? 0), 0) / fourP.length
    : null;

  return (
    <AppShell
      title={client?.company_name ?? "Diagnóstico"}
      subtitle={`${DIAGNOSTIC_STATUS_LABEL[diag.status]} · criado em ${formatDate(diag.created_at)}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            className="btn-ghost"
            to="/plano-de-marketing/$clientId"
            params={{ clientId: diag.client_id }}
            search={{ diagnosticId: id }}
          >
            {diag.status === "validado" ? "Gerar Plano de Marketing" : "Plano de Marketing"}
          </Link>
          <button
            className="btn-ghost"
            onClick={() => runAnalysis.mutate()}
            disabled={runAnalysis.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {runAnalysis.isPending ? "Analisando..." : "Analisar com IA"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(`${window.location.origin}/d/${diag.token}`);
              toast.success("Link do formulário copiado.");
            }}
          >
            <Copy className="h-4 w-4" /> Link do formulário
          </button>
          {diag.status === "validado" ? (
            <button
              className="btn-ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(`${window.location.origin}/r/${diag.token}`);
                toast.success("Link do relatório do cliente copiado.");
              }}
            >
              <Copy className="h-4 w-4" /> Link do relatório
            </button>
          ) : (
            <button
              className="btn-primary"
              disabled={validate.isPending}
              onClick={() => validate.mutate()}
            >
              <CheckCircle2 className="h-4 w-4" />{" "}
              {validate.isPending ? "Validando…" : "Validar diagnóstico"}
            </button>
          )}
          {isAdmin ? (
            <button
              className="btn-ghost text-primary"
              disabled={removeDiagnostic.isPending}
              onClick={() => {
                if (confirm("Excluir este diagnóstico e todas as respostas vinculadas?"))
                  removeDiagnostic.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          ) : null}
        </div>
      }
    >
      {validate.isError && (
        <p role="alert" className="mb-4 text-destructive">
          {validate.error.message}
        </p>
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        Revise as respostas e ajuste as notas na aba Matriz 4P. Depois, valide o diagnóstico para
        liberar o Plano de Marketing.
      </p>
      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["geral", "Diagnóstico geral"],
            ["matriz", "Matriz 4P"],
            ["respostas", "Respostas"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "geral" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="surface-card flex flex-col items-center justify-center p-6">
            <ScoreDial score={overall} size="lg" label="Nota geral 4P" />
            {diag.main_bottleneck ? (
              <p className="mt-5 text-center text-sm text-muted-foreground">
                Principal gargalo:{" "}
                <span className="font-semibold text-foreground">
                  {PILLAR_LABEL[diag.main_bottleneck]}
                </span>
              </p>
            ) : null}
          </section>

          <section className="surface-card p-6 lg:col-span-2">
            <h2 className="text-lg font-bold">Resumo executivo</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {diag.executive_summary ||
                "Ainda sem análise. Clique em “Analisar com IA” para gerar as notas e o resumo a partir das respostas do cliente."}
            </p>
            {diag.main_opportunity ? (
              <div className="mt-5 rounded-lg bg-primary/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Principal oportunidade
                </p>
                <p className="mt-1 text-sm">{diag.main_opportunity}</p>
              </div>
            ) : null}
          </section>

          {ordered.length ? (
            <section className="surface-card p-6 lg:col-span-3">
              <h2 className="text-lg font-bold">Visão comparativa</h2>
              <PillarRadar scores={ordered} />
              <div className="mt-2 grid gap-3 sm:grid-cols-5">
                {ordered.map((s) => (
                  <div key={s.pillar} className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">{PILLAR_LABEL[s.pillar]}</p>
                    <p className="text-display text-xl">
                      {formatScore(s.final_score ?? s.auto_score)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "matriz" ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {ordered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Execute a análise para gerar a matriz 4P.
            </p>
          ) : (
            ordered.map((s) => <PillarCard key={s.pillar} score={s} onEdit={() => setEditing(s)} />)
          )}
        </div>
      ) : null}

      {tab === "respostas" ? (
        <div className="mt-6 space-y-6">
          {STEPS.map((step) => {
            const qs = step.questions.filter((q) => {
              const v = answers[q.key];
              return (
                isVisible(q, answers) &&
                v !== undefined &&
                v !== null &&
                v !== "" &&
                !(Array.isArray(v) && !v.length)
              );
            });
            if (!qs.length) return null;
            return (
              <section key={step.id} className="surface-card p-6">
                <h2 className="text-lg font-bold">{step.title}</h2>
                <dl className="mt-4 space-y-4">
                  {qs.map((q) => (
                    <div key={q.key}>
                      <dt className="text-sm font-medium">{q.label}</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {Array.isArray(answers[q.key])
                          ? (answers[q.key] as string[]).join(", ")
                          : String(answers[q.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      ) : null}

      <div className="mt-8">
        <Link to="/plano-de-acao" className="text-sm font-medium text-primary">
          Ir para o plano de ação
        </Link>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <form
            className="surface-card w-full max-w-md p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveScore.mutate({
                pillar: editing.pillar,
                score: Number(fd.get("score")),
                reason: String(fd.get("reason") ?? ""),
              });
            }}
          >
            <h2 className="text-lg font-bold">Ajustar {PILLAR_LABEL[editing.pillar]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nota automática: {formatScore(editing.auto_score)}
            </p>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium">Nota final (0 a 10)</span>
              <input
                className="input-base"
                name="score"
                type="number"
                min={0}
                max={10}
                step={0.5}
                defaultValue={Number(editing.final_score ?? editing.auto_score ?? 5)}
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Justificativa</span>
              <textarea className="input-base" name="reason" rows={3} required />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saveScore.isPending}>
                Salvar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
