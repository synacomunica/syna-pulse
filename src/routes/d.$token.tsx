import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPublicDiagnostic,
  savePublicAnswers,
  submitPublicDiagnostic,
} from "@/lib/diagnostic.functions";
import {
  STEPS,
  isVisible,
  missingRequired,
  allMissingRequired,
  REQUIRED_KEYS,
  type AnswerValue,
} from "@/lib/questions";
import { QuestionField } from "@/components/question-field";
import { SynaLogo } from "@/components/syna-logo";

export const Route = createFileRoute("/d/$token")({
  head: () => ({
    meta: [
      { title: "Diagnóstico de Marketing — Syna" },
      {
        name: "description",
        content:
          "Formulário de diagnóstico estratégico da Syna. Suas respostas são salvas automaticamente.",
      },
      { property: "og:title", content: "Diagnóstico de Marketing — Syna" },
      {
        property: "og:description",
        content: "Formulário de diagnóstico estratégico da Syna, com salvamento automático.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicForm,
});

type Answers = Record<string, AnswerValue>;

function PublicForm() {
  const { token } = Route.useParams();
  const load = useServerFn(getPublicDiagnostic);
  const save = useServerFn(savePublicAnswers);
  const submit = useServerFn(submitPublicDiagnostic);

  const [state, setState] = useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [company, setCompany] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [invalidKeys, setInvalidKeys] = useState<string[]>([]);
  const dirty = useRef(false);

  useEffect(() => {
    load({ data: { token } })
      .then((d) => {
        if (!d) {
          setState("invalid");
          return;
        }
        setCompany(d.companyName);
        setAnswers(d.answers);
        setStep(Math.min(d.currentStep, STEPS.length - 1));
        setState(
          d.status === "respondido" || d.status === "em_analise" || d.status === "validado"
            ? "done"
            : "ready",
        );
      })
      .catch(() => setState("invalid"));
  }, [load, token]);

  const persist = useCallback(
    async (next: Answers, nextStep: number) => {
      setSaving(true);
      try {
        await save({ data: { token, answers: next, step: nextStep } });
        dirty.current = false;
      } catch {
        toast.error("Não conseguimos salvar agora. Tentaremos novamente.");
      } finally {
        setSaving(false);
      }
    },
    [save, token],
  );

  // Autosave a cada 4s quando há alterações
  useEffect(() => {
    if (state !== "ready") return;
    const id = setInterval(() => {
      if (dirty.current) void persist(answers, step);
    }, 4000);
    return () => clearInterval(id);
  }, [answers, persist, state, step]);

  const current = STEPS[step];
  const visible = useMemo(
    () => current?.questions.filter((q) => isVisible(q, answers)) ?? [],
    [current, answers],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const q of visible) {
      const key = q.group ?? "";
      map.set(key, [...(map.get(key) ?? []), q]);
    }
    return [...map.entries()];
  }, [visible]);

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const setValue = (key: string, v: AnswerValue) => {
    dirty.current = true;
    setAnswers((prev) => ({ ...prev, [key]: v }));
  };

  const goto = async (next: number) => {
    if (next > step && current) {
      const missing = missingRequired(current, answers);
      if (missing.length) {
        setInvalidKeys(missing.map((q) => q.key));
        toast.error("Responda os campos obrigatórios desta etapa para continuar.");
        return;
      }
    }
    setInvalidKeys([]);
    await persist(answers, next);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const askFinish = async () => {
    const missing = allMissingRequired(answers);
    if (missing.length) {
      setInvalidKeys(missing.map((q) => q.key));
      toast.error(
        `Faltam ${missing.length} resposta(s) obrigatória(s). Revise as etapas destacadas.`,
      );
      return;
    }
    setConfirming(true);
  };

  const finish = async () => {
    setConfirming(false);
    await persist(answers, step);
    try {
      await submit({ data: { token } });
      setState("done");
    } catch {
      toast.error("Não foi possível enviar. Tente novamente.");
    }
  };

  if (state === "loading") {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Centered>
    );
  }

  if (state === "invalid") {
    return (
      <Centered>
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de diagnóstico não existe ou expirou. Fale com a equipe Syna.
          </p>
        </div>
      </Centered>
    );
  }

  if (state === "done") {
    return (
      <Centered>
        <div className="surface-card max-w-md p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-strong" />
          <h1 className="mt-4 text-2xl font-bold">Respostas enviadas!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Obrigado. A equipe Syna vai analisar o diagnóstico de {company} e retornar com o
            direcionamento estratégico.
          </p>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <SynaLogo showSub={false} />
          <span className="text-xs text-muted-foreground">
            {saving ? "Salvando..." : "Salvo automaticamente"}
          </span>
        </div>
        <div className="h-1 w-full bg-muted">
          <div className="h-1 bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Etapa {step + 1} de {STEPS.length}
        </p>
        <h1 className="mt-3 text-3xl">{current?.title}</h1>
        <p className="mt-2 text-muted-foreground">{current?.description}</p>

        <div className="mt-10 space-y-10">
          {groups.map(([group, qs]) => (
            <section key={group || "default"} className="surface-card p-6 sm:p-7">
              {group ? (
                <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group}
                </h2>
              ) : null}
              <div className="space-y-7">
                {qs.map((q) => (
                  <div
                    key={q.key}
                    className={
                      invalidKeys.includes(q.key)
                        ? "rounded-lg border border-primary/60 bg-primary/5 p-3"
                        : undefined
                    }
                  >
                    <QuestionField
                      question={q}
                      value={answers[q.key]}
                      onChange={(v) => setValue(q.key, v as AnswerValue)}
                      required={REQUIRED_KEYS.has(q.key)}
                    />
                    {invalidKeys.includes(q.key) ? (
                      <p className="mt-1.5 text-xs font-medium text-primary">
                        Esta resposta é obrigatória.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          <button className="btn-ghost" disabled={step === 0} onClick={() => void goto(step - 1)}>
            Voltar
          </button>
          {step === STEPS.length - 1 ? (
            <button className="btn-primary" onClick={() => void askFinish()}>
              Enviar diagnóstico
            </button>
          ) : (
            <button className="btn-primary" onClick={() => void goto(step + 1)}>
              Continuar
            </button>
          )}
        </div>
      </main>

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <div className="surface-card w-full max-w-md p-7">
            <h2 className="text-xl font-bold">Enviar diagnóstico?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Depois do envio as respostas ficam bloqueadas para edição e seguem para análise da
              equipe Syna. Confira se as informações de {company} estão corretas.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirming(false)}>
                Revisar respostas
              </button>
              <button className="btn-primary" onClick={() => void finish()}>
                Confirmar envio
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {children}
    </div>
  );
}
