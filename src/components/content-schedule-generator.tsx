import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { MarketingPlanContent } from "@/lib/marketing-plan";
import { contentFormats, formatNames, type ScheduleDocument } from "@/lib/content-schedule";
import { generateContentSchedule } from "@/lib/content-schedule.functions";

export function ContentScheduleGenerator({
  plan,
  content,
  dirty,
  disabled,
}: {
  plan: Tables<"marketing_plans">;
  content: MarketingPlanContent;
  dirty: boolean;
  disabled: boolean;
}) {
  const channelNames = [...new Set(content.canais.map((c) => c.canal).filter((c) => c.trim()))];
  const [selected, setSelected] = useState<string[] | null>(null);
  const channels =
    selected === null ? channelNames : selected.filter((name) => channelNames.includes(name));
  const [formats, setFormats] = useState<(typeof contentFormats)[number][]>([...contentFormats]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [days, setDays] = useState(30);
  const [count, setCount] = useState(6);
  const [document, setDocument] = useState<ScheduleDocument | null>(null);
  const [downloading, setDownloading] = useState(false);
  const generation = useMutation({
    mutationFn: () =>
      generateContentSchedule({
        data: {
          planId: plan.id,
          updatedAt: plan.updated_at,
          channels,
          formats,
          startDate,
          days,
          count,
        },
      }),
    onSuccess: (result) => {
      setDocument(result);
      toast.success("Cronograma criado. Baixe o documento Word abaixo.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  async function download() {
    if (!document) return;
    setDownloading(true);
    try {
      const { downloadSchedule } = await import("@/lib/content-schedule-document");
      await downloadSchedule(document);
    } catch {
      toast.error("Não foi possível baixar o Word. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <section className="surface-card p-5 space-y-4">
      <h2 className="text-lg font-bold">Cronograma de conteúdos</h2>
      <p className="text-sm text-muted-foreground">
        Transforme esta versão do plano em um documento Word com legendas, roteiros de vídeo,
        direção de arte e detalhamento de cada card.
      </p>
      {plan.status !== "aprovado" && (
        <p className="text-sm">O documento será identificado como proposta baseada em rascunho.</p>
      )}
      <fieldset disabled={disabled || generation.isPending} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Data inicial
            <input
              className="input-base"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Período
            <select
              className="input-base"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[7, 15, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} dias
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Quantidade de conteúdos
            <select
              className="input-base"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[3, 6, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {n} conteúdos
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold mb-2">Canais salvos no plano</legend>
          <div className="flex flex-wrap gap-4">
            {channelNames.map((name) => (
              <label key={name} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.includes(name)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...channels, name] : channels.filter((c) => c !== name),
                    )
                  }
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold mb-2">Formatos</legend>
          <div className="flex flex-wrap gap-4">
            {contentFormats.map((format) => (
              <label key={format} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formats.includes(format)}
                  onChange={(e) =>
                    setFormats(
                      e.target.checked ? [...formats, format] : formats.filter((f) => f !== format),
                    )
                  }
                />
                {formatNames[format]}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          className="btn-primary"
          disabled={dirty || !channels.length || !formats.length || !startDate}
          onClick={() => generation.mutate()}
        >
          {generation.isPending ? "Criando roteiros e peças…" : "Gerar cronograma de conteúdos"}
        </button>
      </fieldset>
      {dirty && (
        <p role="status" className="text-sm">
          Salve as alterações do plano antes de gerar o cronograma.
        </p>
      )}
      {!channels.length && <p className="text-sm">Adicione ou selecione ao menos um canal.</p>}
      {generation.isPending && (
        <p role="status" className="text-sm">
          A geração pode levar até 90 segundos. Aguarde nesta página.
        </p>
      )}
      {generation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {generation.error.message}
        </p>
      )}
      {document && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">{document.content.titulo}</h3>
            <button className="btn-primary" onClick={() => void download()} disabled={downloading}>
              {downloading ? "Preparando Word…" : "Baixar documento Word"}
            </button>
          </div>
          <p className="text-sm">{document.content.diretriz_editorial}</p>
          <p className="text-sm text-muted-foreground">
            Baixe antes de sair desta página. Revise o documento antes de produzir ou publicar.
          </p>
          {(dirty || document.sourceUpdatedAt !== plan.updated_at) && (
            <p role="alert" className="text-sm text-warning">
              Este cronograma foi criado antes das últimas alterações do plano. Gere novamente para
              incluí-las.
            </p>
          )}
          {document.content.conteudos.map((item, index) => (
            <details key={index} className="border rounded-lg p-3">
              <summary className="cursor-pointer font-medium">
                {item.data.split("-").reverse().join("/")} · {item.canal} ·{" "}
                {formatNames[item.formato]} — {item.titulo}
              </summary>
              <p className="mt-2 text-sm">{item.objetivo}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{item.legenda}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                O documento contém o briefing completo desta peça.
              </p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
