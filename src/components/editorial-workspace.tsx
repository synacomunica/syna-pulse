import { useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { parseMarketingPlan } from "@/lib/marketing-plan-schema";
import { saveEditorialCycle, editorialContext } from "@/lib/editorial.functions";
import { generateContentSchedule } from "@/lib/content-schedule.functions";
import { formatNames, type ScheduleDocument } from "@/lib/content-schedule";
import {
  backwardDates,
  directionSentence,
  functions,
  newTopic,
  nextMonth,
  signals,
  stages,
  validateWorkflow,
  workflowSchema,
  type Topic,
  type Workflow,
} from "@/lib/editorial-workflow";

const tabs = [
  "Direção do mês",
  "Banco e seleção",
  "Aprovação dos temas",
  "Produção",
  "Publicação",
  "Análise",
];
const dateLabel = (s: string) => (s ? s.split("-").reverse().join("/") : "Não definido");
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm space-y-1">
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea
          className="input-base min-h-20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60000}
        />
      ) : (
        <input
          className="input-base"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={6000}
        />
      )}
    </label>
  );
}
export function EditorialWorkspace({ clientId }: { clientId: string }) {
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [seed, setSeed] = useState<Workflow>();
  const query = useQuery({
    queryKey: ["editorial", clientId],
    queryFn: async () => {
      const [plans, cycles] = await Promise.all([
        supabase
          .from("marketing_plans")
          .select("*")
          .eq("client_id", clientId)
          .order("version", { ascending: false }),
        supabase
          .from("editorial_cycles")
          .select("*")
          .eq("client_id", clientId)
          .order("month", { ascending: false }),
      ]);
      if (plans.error) throw plans.error;
      if (cycles.error) throw cycles.error;
      return { plans: plans.data, cycles: cycles.data };
    },
  });
  useBlocker({
    shouldBlockFn: () => dirty && !confirm("Sair sem salvar as alterações do cronograma?"),
    enableBeforeUnload: dirty,
  });
  const cycle = creating
    ? undefined
    : (query.data?.cycles.find((c) => c.id === selected) ?? query.data?.cycles[0]);
  const plan = query.data?.plans.find((p) => p.id === cycle?.plan_id) ?? query.data?.plans[0];
  const { isAdmin } = useAuth();
  function switchCycle(id: string) {
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    setDirty(false);
    setSeed(undefined);
    setCreating(id === "new");
    setSelected(id);
  }
  if (query.isPending) return <p role="status">Carregando planejamento…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Não foi possível carregar os ciclos. Verifique a instalação do módulo de conteúdos.{" "}
        <button className="btn-outline" onClick={() => void query.refetch()}>
          Tentar novamente
        </button>
      </p>
    );
  if (!plan)
    return (
      <section className="surface-card p-5">
        <p>Crie um plano a partir de um diagnóstico respondido, analisado e validado.</p>
        <Link className="btn-primary mt-3" to="/plano-de-marketing/$clientId" params={{ clientId }}>
          Abrir plano de marketing
        </Link>
      </section>
    );
  return (
    <div className="space-y-4">
      <label className="block text-sm">
        Ciclo mensal
        <select
          className="input-base"
          value={creating || !cycle ? "new" : cycle.id}
          onChange={(e) => switchCycle(e.target.value)}
        >
          {query.data.cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.month}
            </option>
          ))}
          {isAdmin && <option value="new">Novo mês</option>}
        </select>
      </label>
      <CycleEditor
        key={cycle?.id ?? `new-${seed?.month ?? "empty"}`}
        plan={plan}
        cycle={cycle}
        previous={
          query.data.cycles.filter(
            (c) => c.month < (cycle?.month ?? seed?.month ?? new Date().toISOString().slice(0, 7)),
          )[0]
        }
        seed={seed}
        onDirty={setDirty}
        onSaved={(id) => {
          setSelected(id);
          setCreating(false);
          setSeed(undefined);
        }}
        onNext={(w) => {
          if (dirty) {
            toast.error("Salve o fechamento antes de abrir o próximo mês.");
            return;
          }
          setSeed(nextMonth(w));
          setCreating(true);
          setDirty(false);
        }}
      />
    </div>
  );
}
function CycleEditor({
  plan,
  cycle,
  previous,
  seed,
  onDirty,
  onSaved,
  onNext,
}: {
  plan: Tables<"marketing_plans">;
  cycle: Tables<"editorial_cycles"> | undefined;
  previous: Tables<"editorial_cycles"> | undefined;
  seed: Workflow | undefined;
  onDirty: (v: boolean) => void;
  onSaved: (id: string) => void;
  onNext: (w: Workflow) => void;
}) {
  const p = parseMarketingPlan(plan.content);
  const initial = cycle ? workflowSchema.safeParse(cycle.content) : null;
  const [w, setW] = useState<Workflow>(() =>
    initial?.success
      ? initial.data
      : (seed ?? {
          month: new Date().toISOString().slice(0, 7),
          direction: {
            priority: p.objetivo_principal.descricao,
            product: "",
            audience: p.publico_estrategico,
            barrier: p.diagnostico_partida.problema,
            benefit: p.conteudo_comunicacao.mensagem_central,
            action: p.mudanca_comportamento.estado_desejado,
            event: "",
            contentLimit: 6,
            visits: 0,
            stories: false,
            capacity: "",
          },
          topics: [],
          review: { repeat: "", adjust: "", questions: "", delays: "" },
        }),
  );
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState(
    cycle?.source_updated_at ?? plan.updated_at,
  );
  const [revision, setRevision] = useState(cycle?.updated_at);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [document, setDocument] = useState<ScheduleDocument | null>(null);
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const context = useQuery({
    queryKey: ["editorial-context", plan.id, plan.updated_at],
    queryFn: () => editorialContext({ data: { planId: plan.id } }),
  });
  const save = useMutation({
    mutationFn: () =>
      saveEditorialCycle({
        data: {
          ...(cycle ? { id: cycle.id, updatedAt: revision! } : {}),
          planId: plan.id,
          sourceUpdatedAt,
          content: w,
        },
      }),
    onSuccess: async (result) => {
      setRevision(result.cycle.updated_at);
      setDirty(false);
      onDirty(false);
      setWarnings(result.warnings);
      await qc.invalidateQueries({ queryKey: ["editorial", plan.client_id] });
      onSaved(result.cycle.id);
      toast.success("Ciclo salvo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  function change(value: Workflow) {
    setW(value);
    setDirty(true);
    onDirty(true);
  }
  function patch(id: string, value: Partial<Topic>) {
    change({ ...w, topics: w.topics.map((t) => (t.id === id ? { ...t, ...value } : t)) });
  }
  function transition(t: Topic, status: Topic["status"]) {
    try {
      const value = { ...w, topics: w.topics.map((x) => (x.id === t.id ? { ...x, status } : x)) };
      validateWorkflow(value);
      change(value);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revise os campos.");
    }
  }
  const approved = w.topics.filter((t) => t.status === "tema_aprovado").slice(0, 12);
  const generation = useMutation({
    mutationFn: async () => {
      if (!cycle || dirty) throw new Error("Salve o ciclo antes de gerar as peças.");
      if (!approved.length || approved.length > 12)
        throw new Error(
          "Gere de 1 a 12 temas aprovados por vez. Mova as peças geradas para produção antes do próximo lote.",
        );
      if (approved.some((t) => !t.format || !t.channel || !t.publication))
        throw new Error("Defina formato, canal e data para todos os temas aprovados.");
      return generateContentSchedule({
        data: {
          planId: plan.id,
          updatedAt: plan.updated_at,
          cycleId: cycle.id,
          topicIds: approved.map((t) => t.id),
          startDate: `${w.month}-01`,
          days: new Date(Number(w.month.slice(0, 4)), Number(w.month.slice(5)), 0).getDate(),
          count: approved.length,
          channels: [...new Set(approved.map((t) => t.channel))],
          formats: [...new Set(approved.map((t) => t.format as Exclude<Topic["format"], "">))],
        },
      });
    },
    onSuccess: (result) => {
      setDocument(result);
      change({
        ...w,
        topics: w.topics.map((t) => {
          const c = result.content.conteudos.find((c) => c.pauta_id === t.id);
          return c
            ? {
                ...t,
                copy: [
                  c.legenda,
                  c.texto_arte,
                  ...c.cenas.map(
                    (s) =>
                      `${s.duracao} | ${s.visual}\n${s.fala}\nTela: ${s.texto_tela}\nÁudio: ${s.audio}`,
                  ),
                  ...c.cards.map(
                    (s, i) => `Card ${i + 1}: ${s.titulo}\n${s.texto}\n${s.composicao}`,
                  ),
                ]
                  .filter(Boolean)
                  .join("\n\n"),
                visual: c.orientacao_visual + "\n" + c.acessibilidade,
                materials: c.materiais_necessarios.join("\n"),
              }
            : t;
        }),
      });
      setWarnings(result.content.alertas);
      toast.success("Peças geradas. Revise e salve o ciclo para preservar os textos.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const previousResult = previous ? workflowSchema.safeParse(previous.content) : null;
  const selected = w.topics.filter((t) => t.status !== "banco");
  const busy = save.isPending || generation.isPending;
  if (initial && !initial.success)
    return <p role="alert">O ciclo salvo tem formato inválido. Nenhuma alteração foi feita.</p>;
  const tfield = (t: Topic, key: keyof Topic, label: string, type = "textarea") => (
    <Field
      label={label}
      value={String(t[key])}
      type={type}
      onChange={(value) => patch(t.id, { [key]: value })}
    />
  );
  return (
    <div className="space-y-4">
      <section className="surface-card p-5 space-y-3">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Planejamento de {w.month}</h2>
            <p className="text-sm text-muted-foreground">
              Plano v{plan.version} · {selected.length}/{w.direction.contentLimit} conteúdos ·{" "}
              {dirty ? "Alterações não salvas" : "Salvo"}
            </p>
          </div>
          {isAdmin && (
            <button
              className="btn-primary"
              disabled={busy || context.isPending || context.isError}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Salvando…" : "Salvar ciclo"}
            </button>
          )}
        </div>
        {cycle && sourceUpdatedAt !== plan.updated_at && (
          <div role="alert" className="space-y-2 text-sm text-warning">
            <p>
              O plano de origem foi alterado. Revise a direção e as pautas antes de produzir com IA.
            </p>
            {isAdmin && (
              <button
                className="btn-outline"
                disabled={busy || w.topics.some((t) => t.status === "publicado")}
                onClick={() => {
                  setSourceUpdatedAt(plan.updated_at);
                  change({
                    ...w,
                    topics: w.topics.map((t) => ({
                      ...t,
                      status: "banco",
                      themeApproval: "",
                      pieceApproval: "",
                    })),
                  });
                  setTab(0);
                }}
              >
                Usar plano atual e devolver pautas para nova seleção e aprovação
              </button>
            )}
            {w.topics.some((t) => t.status === "publicado") && (
              <p>
                Este ciclo já tem publicações. Preserve o histórico e utilize a estratégia atual no
                próximo mês.
              </p>
            )}
          </div>
        )}
        {plan.status !== "aprovado" && (
          <p className="text-sm text-warning">
            Plano em rascunho: valide a estratégia antes de aprovar peças.
          </p>
        )}
        {warnings.map((v, i) => (
          <p key={i} className="text-sm text-warning">
            {v}
          </p>
        ))}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Etapas da metodologia">
          {tabs.map((label, i) => (
            <button
              key={label}
              role="tab"
              aria-selected={tab === i}
              className={tab === i ? "btn-primary" : "btn-outline"}
              onClick={() => setTab(i)}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      </section>
      <fieldset
        disabled={!isAdmin || busy}
        className="space-y-4"
        role="tabpanel"
        aria-label={tabs[tab]}
      >
        {tab === 0 && (
          <>
            <section className="surface-card p-5 space-y-4">
              <h3 className="font-bold">Uma prioridade para orientar o mês</h3>
              <Field
                label="Mês"
                type="month"
                value={w.month}
                onChange={(month) => {
                  if (!cycle) change({ ...w, month });
                }}
              />
              {cycle && (
                <p className="text-xs text-muted-foreground">
                  O mês do ciclo salvo é fixo. Use Novo mês para outro período.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["priority", "Prioridade comercial principal"],
                    ["product", "Produto ou serviço prioritário"],
                    ["audience", "Público"],
                    ["barrier", "Dúvida, dificuldade ou objeção"],
                    ["benefit", "Benefício ou diferencial"],
                    ["action", "Ação esperada"],
                    ["event", "Oferta, lançamento ou acontecimento (se houver)"],
                    ["capacity", "Capacidade, equipe e restrições de produção"],
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={w.direction[key]}
                    type="textarea"
                    onChange={(value) =>
                      change({ ...w, direction: { ...w.direction, [key]: value } })
                    }
                  />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["contentLimit", "Conteúdos previstos no contrato para este mês"],
                    ["visits", "Visitas de captação previstas"],
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    type="number"
                    value={String(w.direction[key])}
                    onChange={(v) =>
                      change({ ...w, direction: { ...w.direction, [key]: Number(v) } })
                    }
                  />
                ))}
              </div>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={w.direction.stories}
                  onChange={(e) =>
                    change({ ...w, direction: { ...w.direction, stories: e.target.checked } })
                  }
                />
                Stories estão no escopo confirmado
              </label>
              <p className="rounded-lg bg-muted p-4 font-medium">
                {directionSentence(w.direction)}
              </p>
            </section>
            <section className="surface-card p-5 space-y-3">
              <h3 className="font-bold">Base estratégica do sistema</h3>
              <p className="text-sm">
                As sugestões iniciais vêm do plano salvo. Confirme produto, contrato e capacidade
                para este mês.
              </p>
              <p>{p.resumo_estrategico}</p>
              <p>
                <strong>Gargalo:</strong> {p.diagnostico_partida.problema || "Não informado"}
              </p>
              <p>
                <strong>Estratégia:</strong> {p.estrategia_central}
              </p>
              {context.isPending && <p role="status">Consultando formulário, análises e escopo…</p>}
              {context.isError && (
                <p role="alert">
                  Não foi possível consultar as fontes.{" "}
                  <button className="btn-outline" onClick={() => void context.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
              {context.data && (
                <>
                  <p>
                    <strong>Relatório do diagnóstico:</strong>{" "}
                    {context.data.diagnostic?.executive_summary || "Não disponível"}
                  </p>
                  <p>
                    <strong>Oportunidade:</strong>{" "}
                    {context.data.diagnostic?.main_opportunity || "Não informada"}
                  </p>
                  <details>
                    <summary className="cursor-pointer">
                      Escopo contratado e fontes ({context.data.sources.length})
                    </summary>
                    <p className="my-3">
                      {context.data.scope
                        ? `Escopo v${context.data.scope.version} · ${context.data.scope.status}`
                        : "Sem escopo confirmado: quantidades exigem conferência."}
                    </p>
                    {context.data.scope?.content.items.map((i) => (
                      <p key={i.id} className="text-sm border-b py-2">
                        {i.service} · {i.quantity ?? "?"} {i.unit}/{i.period} · {i.classification} ·
                        Produção: {i.productionDays ?? "?"} dias; aprovação: {i.approvalDays ?? "?"}{" "}
                        dias ({i.deadlineBasis}) · {i.capture}
                      </p>
                    ))}
                    {context.data.sources.map((s) => (
                      <p key={s.id} className="text-sm border-b py-2">
                        <strong>{s.reference}</strong>
                        <br />
                        {s.value}
                      </p>
                    ))}
                  </details>
                </>
              )}
              <Link
                className="underline text-sm"
                to="/plano-de-marketing/$clientId"
                params={{ clientId: plan.client_id }}
              >
                Consultar plano e análises completos
              </Link>
            </section>
            {previousResult?.success && (
              <section className="surface-card p-5 space-y-2">
                <h3 className="font-bold">Aprendizados de {previous?.month}</h3>
                {Object.entries(previousResult.data.review).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <strong>
                      {
                        {
                          repeat: "Repetir",
                          adjust: "Ajustar",
                          questions: "Novas dúvidas",
                          delays: "Atrasos",
                        }[key]
                      }
                      :
                    </strong>{" "}
                    {value || "Sem registro"}
                  </p>
                ))}
                {previousResult.data.topics
                  .filter((t) => t.learning)
                  .map((t) => (
                    <p key={t.id} className="text-sm">
                      {t.theme}: {t.learning}
                    </p>
                  ))}
              </section>
            )}
          </>
        )}
        {tab === 1 && (
          <>
            <section className="surface-card p-5 space-y-3">
              <h3 className="font-bold">Pautas antes dos formatos</h3>
              <p className="text-sm text-muted-foreground">
                Use perguntas do atendimento, objeções, produtos prioritários, bastidores e provas
                documentadas. Registre uma abordagem específica para cada assunto.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  onClick={() => change({ ...w, topics: [...w.topics, newTopic()] })}
                >
                  Adicionar pauta
                </button>
                <button
                  className="btn-outline"
                  onClick={() => {
                    const existing = new Set(w.topics.map((t) => t.theme));
                    const ideas = p.conteudo_comunicacao.temas
                      .filter((theme) => !existing.has(theme))
                      .map((theme) => ({
                        ...newTopic(),
                        theme,
                        audience: w.direction.audience,
                        source: `Plano de marketing v${plan.version} — sugestão a desenvolver`,
                      }));
                    change({ ...w, topics: [...w.topics, ...ideas] });
                  }}
                >
                  Trazer temas do plano
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(functions).map(([key, label]) => (
                  <span key={key}>
                    {label}: {selected.filter((t) => t.purpose === key).length}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sem proporção fixa: distribua as funções conforme o diagnóstico e a prioridade.
              </p>
            </section>
            {w.topics.map((t) => (
              <section key={t.id} className="surface-card p-5 space-y-3">
                <h3 className="font-bold">
                  {t.theme || "Nova pauta"}{" "}
                  <span className="text-sm text-muted-foreground">· {stages[t.status]}</span>
                </h3>
                {t.status !== "banco" ? (
                  <>
                    <p>{t.approach}</p>
                    <p className="text-sm">{t.message}</p>
                    <button
                      className="btn-outline"
                      onClick={() =>
                        patch(t.id, { status: "banco", themeApproval: "", pieceApproval: "" })
                      }
                    >
                      Devolver ao banco para ajustar e aprovar novamente
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      {tfield(t, "theme", "Tema", "text")}
                      {tfield(t, "approach", "Abordagem / gancho")}
                      {tfield(t, "audience", "Público")}
                      {tfield(t, "need", "Problema ou desejo")}
                      {tfield(t, "message", "Mensagem principal")}
                      {tfield(t, "cta", "Ação esperada / CTA")}
                      {tfield(t, "source", "Origem: pergunta, objeção, relatório ou atendimento")}
                      {tfield(t, "evidence", "Informação ou evidência que sustenta a mensagem")}
                      {tfield(
                        t,
                        "materials",
                        "Material ou informação que o cliente precisa fornecer",
                      )}
                    </div>
                    <label className="block text-sm">
                      Função
                      <select
                        className="input-base"
                        value={t.purpose}
                        onChange={(e) =>
                          patch(t.id, { purpose: e.target.value as Topic["purpose"] })
                        }
                      >
                        {Object.entries(functions).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(
                      [
                        ["priority", "Contribui para a prioridade do mês"],
                        ["audience", "Interessa ao público escolhido"],
                        ["evidence", "Tem informação ou evidência suficiente"],
                        ["feasible", "Cabe no contrato, capacidade e prazo"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={t.checks[key]}
                          onChange={(e) =>
                            patch(t.id, { checks: { ...t.checks, [key]: e.target.checked } })
                          }
                        />
                        {label}
                      </label>
                    ))}
                    <button className="btn-primary" onClick={() => transition(t, "selecionada")}>
                      Selecionar para o mês
                    </button>
                  </>
                )}
              </section>
            ))}
          </>
        )}
        {tab === 2 && (
          <section className="surface-card p-5 space-y-4">
            <h3 className="font-bold">Aprovar temas antes de produzir</h3>
            <p className="text-sm">
              Apresente tema, abordagem, objetivo e materiais ao cliente. Registre a aprovação
              recebida; o sistema não envia mensagens automaticamente.
            </p>
            <button
              className="btn-outline"
              onClick={() => {
                const text = selected
                  .map(
                    (t) =>
                      `Tema: ${t.theme}\nAbordagem: ${t.approach}\nObjetivo: ${functions[t.purpose]} — ${t.message}\nMaterial solicitado: ${t.materials || "A confirmar"}`,
                  )
                  .join("\n\n");
                void navigator.clipboard
                  .writeText(text)
                  .then(() => toast.success("Lista copiada para apresentar ao cliente."))
                  .catch(() => toast.error("Não foi possível copiar. Selecione a lista na tela."));
              }}
            >
              Copiar lista de temas
            </button>
            {!selected.length && (
              <p>Nenhuma pauta selecionada. Use o banco e os quatro critérios.</p>
            )}
            {selected.map((t) => (
              <article key={t.id} className="border rounded-lg p-4 space-y-3">
                <h4 className="font-bold">
                  {t.theme} · {stages[t.status]}
                </h4>
                <p>{t.approach}</p>
                <p className="text-sm">
                  {functions[t.purpose]}: {t.message}
                </p>
                <p className="text-sm">Material: {t.materials || "A confirmar"}</p>
                {t.status === "selecionada" ? (
                  <>
                    {tfield(
                      t,
                      "themeApproval",
                      "Quem aprovou, data e referência da aprovação (ex.: conversa ou e-mail)",
                    )}
                    <button className="btn-primary" onClick={() => transition(t, "tema_aprovado")}>
                      Registrar tema aprovado
                    </button>
                  </>
                ) : (
                  <p className="text-sm">Aprovação: {t.themeApproval}</p>
                )}
              </article>
            ))}
          </section>
        )}
        {tab === 3 && (
          <>
            <section className="surface-card p-5 space-y-3">
              <h3 className="font-bold">Cronograma de produção</h3>
              <p className="text-sm">
                Escolha o formato pela mensagem: estático para informação rápida, carrossel para
                explicar, vídeo para demonstrar e Stories para rotina. Planeje da publicação para
                trás.
              </p>
              <button
                className="btn-primary"
                disabled={
                  dirty ||
                  !cycle ||
                  !approved.length ||
                  approved.length > 12 ||
                  context.isError ||
                  context.isPending
                }
                onClick={() => generation.mutate()}
              >
                {generation.isPending
                  ? "Gerando peças dos temas aprovados…"
                  : "Gerar textos e roteiros dos temas aprovados"}
              </button>
              <p className="text-xs text-muted-foreground">
                Até 12 pautas por lote. Salve primeiro. Após revisar cada peça, mova-a para produção
                para liberar o próximo lote.
              </p>
              {document && (
                <button
                  className="btn-outline"
                  onClick={() =>
                    void import("@/lib/content-schedule-document")
                      .then((m) => m.downloadSchedule(document))
                      .catch(() => toast.error("Falha ao exportar o documento."))
                  }
                >
                  Baixar Word do último lote gerado
                </button>
              )}
            </section>
            {selected
              .filter((t) => t.status !== "selecionada")
              .sort((a, b) => (a.productionDue || "9999").localeCompare(b.productionDue || "9999"))
              .map((t) => (
                <section key={t.id} className="surface-card p-5 space-y-3">
                  <h3 className="font-bold">
                    {t.theme} · {stages[t.status]}
                  </h3>
                  <p>{t.approach}</p>
                  {["tema_aprovado", "producao"].includes(t.status) ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm">
                          Formato
                          <select
                            className="input-base"
                            value={t.format}
                            onChange={(e) =>
                              patch(t.id, { format: e.target.value as Topic["format"] })
                            }
                          >
                            <option value="">Escolha após definir a mensagem</option>
                            {Object.entries(formatNames)
                              .filter(([key]) => key !== "stories" || w.direction.stories)
                              .map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="text-sm">
                          Canal
                          <select
                            className="input-base"
                            value={t.channel}
                            onChange={(e) => patch(t.id, { channel: e.target.value })}
                          >
                            <option value="">Selecione</option>
                            {p.canais.map((c) => (
                              <option key={c.canal} value={c.canal}>
                                {c.canal}
                              </option>
                            ))}
                          </select>
                        </label>
                        {tfield(t, "formatReason", "Por que esse formato serve à mensagem?")}
                        {tfield(t, "owner", "Responsável", "text")}
                        {tfield(t, "materials", "Materiais necessários e pendências")}
                        {tfield(t, "publication", "Data de publicação", "date")}
                      </div>
                      <label className="block text-sm">
                        Entrega do escopo contratado
                        <select
                          className="input-base"
                          value={t.scopeItemId}
                          onChange={(e) => patch(t.id, { scopeItemId: e.target.value })}
                        >
                          <option value="">
                            Enquadramento automático quando houver uma única opção
                          </option>
                          {context.data?.scope?.content.items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.service} · {i.quantity ?? "?"} {i.unit}/{i.period}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="btn-outline"
                        disabled={!t.publication}
                        onClick={() => patch(t.id, backwardDates(t.publication))}
                      >
                        Sugerir prazos de trás para frente
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Sugestão em dias corridos: 3 dias de produção e 2 de aprovação. Ajuste ao
                        contrato, disponibilidade e feriados.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {tfield(t, "scriptDue", "Prazo do roteiro", "date")}
                        {tfield(t, "captureDue", "Data de captação (se necessária)", "date")}
                        {tfield(t, "productionDue", "Prazo de edição/design", "date")}
                        {tfield(t, "approvalDue", "Prazo de aprovação", "date")}
                      </div>
                      <details>
                        <summary className="cursor-pointer font-medium">
                          Agrupar gravações por visita
                        </summary>
                        <div className="grid gap-3 md:grid-cols-2 mt-3">
                          {tfield(t, "captureGroup", "Nome da visita / grupo", "text")}
                          {tfield(t, "location", "Local", "text")}
                          {tfield(t, "person", "Pessoa em cena", "text")}
                          {tfield(t, "equipment", "Equipamento", "text")}
                        </div>
                      </details>
                      {tfield(t, "copy", "Peça: gancho, desenvolvimento, CTA, roteiro ou cards")}
                      {tfield(t, "visual", "Orientação visual e acessibilidade")}
                      {t.status === "tema_aprovado" && (
                        <button className="btn-primary" onClick={() => transition(t, "producao")}>
                          Iniciar produção
                        </button>
                      )}
                      {t.status === "producao" && (
                        <>
                          {tfield(
                            t,
                            "pieceApproval",
                            "Aprovação da peça: quem, quando e referência",
                          )}
                          <button
                            className="btn-primary"
                            disabled={plan.status !== "aprovado"}
                            onClick={() => transition(t, "peca_aprovada")}
                          >
                            Registrar peça aprovada
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm">{t.copy}</p>
                      <p>Aprovação: {t.pieceApproval}</p>
                      {t.status === "peca_aprovada" && (
                        <button
                          className="btn-outline"
                          onClick={() => patch(t.id, { status: "producao", pieceApproval: "" })}
                        >
                          Reabrir peça para ajustes e nova aprovação
                        </button>
                      )}
                    </>
                  )}
                </section>
              ))}
            <section className="surface-card p-5 space-y-2">
              <h3 className="font-bold">Visitas de captação</h3>
              {[
                ...new Set(
                  selected
                    .filter((t) => t.captureDue)
                    .map((t) => `${t.captureDue}|${t.captureGroup}`),
                ),
              ]
                .sort()
                .map((key) => (
                  <div key={key} className="border-b py-2">
                    <strong>{key.split("|").join(" · ")}</strong>
                    {selected
                      .filter((t) => `${t.captureDue}|${t.captureGroup}` === key)
                      .map((t) => (
                        <p key={t.id} className="text-sm">
                          {t.theme} — {t.location} · {t.person} · {t.equipment}
                        </p>
                      ))}
                  </div>
                ))}
            </section>
          </>
        )}
        {tab === 4 && (
          <section className="surface-card p-5 space-y-4">
            <h3 className="font-bold">Calendário de publicação</h3>
            {!selected.length && <p>Selecione pautas para montar o calendário.</p>}
            {[...selected]
              .sort((a, b) => (a.publication || "9999").localeCompare(b.publication || "9999"))
              .map((t) => (
                <article key={t.id} className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-bold">
                    {dateLabel(t.publication)} · {t.theme}
                  </h4>
                  <p className="text-sm">
                    {t.channel || "Canal pendente"} ·{" "}
                    {t.format ? formatNames[t.format] : "Formato pendente"} · {stages[t.status]}
                  </p>
                  <p>{t.message}</p>
                  <p className="text-sm">CTA: {t.cta}</p>
                  <p className="text-sm">
                    Produção: {dateLabel(t.productionDue)} · Aprovação: {dateLabel(t.approvalDue)} ·{" "}
                    {t.owner || "Responsável pendente"}
                  </p>
                  {t.status === "peca_aprovada" && (
                    <>
                      {tfield(
                        t,
                        "publishedUrl",
                        "Link ou referência da publicação efetiva",
                        "text",
                      )}
                      <button className="btn-primary" onClick={() => transition(t, "publicado")}>
                        Registrar publicação realizada
                      </button>
                    </>
                  )}
                  {t.status === "publicado" && (
                    <p className="text-sm break-all">Publicação: {t.publishedUrl}</p>
                  )}
                </article>
              ))}
          </section>
        )}
        {tab === 5 && (
          <>
            <section className="surface-card p-5 space-y-4">
              <h3 className="font-bold">Resultados conforme o objetivo</h3>
              <p className="text-sm">
                Registre somente resultados observados. Campo vazio significa não informado, não
                zero. Inclua período, fonte e contexto para comparar corretamente.
              </p>
              {selected
                .filter((t) => t.status === "publicado")
                .map((t) => (
                  <article key={t.id} className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-bold">
                      {t.theme} · {functions[t.purpose]}
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      {signals[t.purpose].map((label) => (
                        <Field
                          key={label}
                          label={label}
                          value={t.results[label] ?? ""}
                          onChange={(v) => patch(t.id, { results: { ...t.results, [label]: v } })}
                        />
                      ))}
                    </div>
                    <Field
                      label="Período, fonte e observações"
                      value={t.results["contexto"] ?? ""}
                      onChange={(v) => patch(t.id, { results: { ...t.results, contexto: v } })}
                    />
                    {tfield(t, "learning", "O que este resultado ensina para a próxima pauta?")}
                  </article>
                ))}
              {!selected.some((t) => t.status === "publicado") && (
                <p>Registre a publicação das peças para acompanhar os resultados.</p>
              )}
            </section>
            <section className="surface-card p-5 space-y-4">
              <h3 className="font-bold">Fechamento e próximo mês</h3>
              {(
                [
                  ["repeat", "O que repetir com uma nova abordagem?"],
                  ["adjust", "O que precisa ser ajustado?"],
                  ["questions", "Que dúvidas podem virar novas pautas?"],
                  ["delays", "O que atrasou a produção e como corrigir?"],
                ] as const
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  type="textarea"
                  value={w.review[key]}
                  onChange={(v) => change({ ...w, review: { ...w.review, [key]: v } })}
                />
              ))}
              <button className="btn-outline" disabled={dirty || !cycle} onClick={() => onNext(w)}>
                Planejar próximo mês com o banco de ideias
              </button>
              <p className="text-xs text-muted-foreground">
                O banco segue para o novo ciclo. O fechamento e os resultados ficam disponíveis como
                referência e alimentam a geração seguinte.
              </p>
            </section>
          </>
        )}
      </fieldset>
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Visualização do planejamento. Edição e aprovações são registradas por administradores.
        </p>
      )}
    </div>
  );
}
