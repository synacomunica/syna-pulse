import type { MarketingPlanContent } from "@/lib/marketing-plan";

type Channels = MarketingPlanContent["canais"];
export function MarketingPlanChannels({
  channels,
  editable,
  onChange,
  onEdit,
  busy,
}: {
  channels: Channels;
  editable: boolean;
  onChange: (channels: Channels) => void;
  onEdit: () => void;
  busy: boolean;
}) {
  const labels = {
    canal: "Canal",
    objetivo: "Objetivo",
    estrategia: "Estratégia",
    etapa: "Etapa da jornada",
    justificativa: "Justificativa",
  } as const;
  return (
    <section className="surface-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Canais do plano</h2>
          <p className="text-sm text-muted-foreground">
            Inclua canais como Instagram e defina seu papel na estratégia.
          </p>
        </div>
        {!editable && (
          <button className="btn-ghost" disabled={busy} onClick={onEdit}>
            Gerenciar canais
          </button>
        )}
      </div>
      {!channels.length && <p className="text-sm">Nenhum canal adicionado.</p>}
      {channels.map((channel, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          {editable ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(labels) as (keyof Channels[number])[]).map((key) => (
                  <label key={key} className="text-sm font-medium">
                    {labels[key]}
                    {key === "etapa" ? (
                      <select
                        className="input-base"
                        value={channel.etapa}
                        onChange={(e) =>
                          onChange(
                            channels.map((c, i) =>
                              i === index ? { ...c, etapa: e.target.value } : c,
                            ),
                          )
                        }
                      >
                        <option value="">Escolher etapa</option>
                        {["aware", "appeal", "ask", "act", "advocate"].map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        className="input-base"
                        rows={key === "canal" ? 1 : 2}
                        value={channel[key]}
                        onChange={(e) =>
                          onChange(
                            channels.map((c, i) =>
                              i === index ? { ...c, [key]: e.target.value } : c,
                            ),
                          )
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              <button
                className="btn-ghost text-destructive"
                onClick={() => onChange(channels.filter((_, i) => i !== index))}
              >
                Remover canal {channel.canal}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold">{channel.canal}</h3>
              <p className="text-sm">{channel.objetivo}</p>
              <p className="text-sm text-muted-foreground">{channel.estrategia}</p>
            </>
          )}
        </div>
      ))}
      {editable && (
        <button
          className="btn-ghost"
          onClick={() =>
            onChange([
              ...channels,
              { canal: "", objetivo: "", estrategia: "", etapa: "", justificativa: "" },
            ])
          }
        >
          + Adicionar canal
        </button>
      )}
    </section>
  );
}
