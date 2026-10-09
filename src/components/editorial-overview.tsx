import { useState } from "react";
import { CalendarDays, List, Download, Plus, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { functions, stages, type Workflow, type Topic } from "@/lib/editorial-workflow";
import { formatNames } from "@/lib/content-schedule";
import { calendarDays, scheduleCsv } from "@/lib/editorial-overview";
const date = (v: string) => (v ? v.split("-").reverse().join("/") : "Sem data");
const colors: Record<Topic["purpose"], string> = {
  atrair: "bg-violet-100 text-violet-800",
  explicar: "bg-blue-100 text-blue-800",
  confiar: "bg-emerald-100 text-emerald-800",
  comprar: "bg-amber-100 text-amber-900",
};
export function EditorialOverview({
  workflow: w,
  canEdit,
  onAdd,
  onEdit,
}: {
  workflow: Workflow;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (t: Topic) => void;
}) {
  const [view, setView] = useState("lista");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [focus, setFocus] = useState<Topic | null>(null);
  const selected = w.topics.filter((t) => t.status !== "banco");
  const topics = w.topics
    .filter(
      (t) =>
        (!status || t.status === status) &&
        `${t.theme} ${t.approach} ${t.channel}`
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")),
    )
    .sort(
      (a, b) =>
        (a.publication || "9999").localeCompare(b.publication || "9999") ||
        a.publicationTime.localeCompare(b.publicationTime),
    );
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([scheduleCsv(topics, { formats: formatNames, purposes: functions, stages })], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `cronograma-${w.month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <section className="surface-card p-5 border-t-4 border-t-violet-400">
          <p className="text-sm text-muted-foreground">Conteúdos do mês</p>
          <strong className="text-3xl block my-2 text-violet-700">
            {selected.length}
            <span className="text-base text-muted-foreground"> / {w.direction.contentLimit}</span>
          </strong>
          <p className="text-xs text-muted-foreground">
            {w.topics.length - selected.length} ideias no banco
          </p>
        </section>
        <section className="surface-card p-5">
          <p className="text-sm text-muted-foreground mb-3">Função da mensagem</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(functions).map(([key, label]) => (
              <span
                key={key}
                className={`text-xs rounded-lg px-2 py-1 ${colors[key as Topic["purpose"]]}`}
              >
                {label}: {selected.filter((t) => t.purpose === key).length}
              </span>
            ))}
          </div>
        </section>
        <section className="surface-card p-5">
          <p className="text-sm text-muted-foreground mb-3">Formatos previstos</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(formatNames).map(([key, label]) => {
              const n = selected.filter((t) => t.format === key).length;
              return n ? (
                <span className="text-xs rounded-lg bg-slate-100 px-2 py-1" key={key}>
                  {label}: {n}
                </span>
              ) : null;
            })}
            {selected.every((t) => !t.format) && (
              <p className="text-sm">Defina após aprovar os temas</p>
            )}
          </div>
        </section>
        <section className="surface-card p-5">
          <p className="text-sm text-muted-foreground mb-3">Andamento</p>
          <p className="text-sm">
            {selected.filter((t) => t.status === "producao").length} em produção
          </p>
          <p className="text-sm">
            {selected.filter((t) => t.status === "peca_aprovada").length} prontas para publicar
          </p>
          <p className="text-sm">
            {selected.filter((t) => t.status === "publicado").length} publicadas
          </p>
        </section>
      </div>
      <section className="surface-card overflow-hidden">
        <div className="p-5 border-b space-y-4">
          <div className="flex justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-lg">Seu cronograma</h3>
              <p className="text-sm text-muted-foreground">
                Abra uma pauta para consultar o briefing e continuar a produção.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canEdit && (
                <button className="btn-primary" onClick={onAdd}>
                  <Plus className="w-4 h-4" />
                  Adicionar pauta
                </button>
              )}
              <button className="btn-outline" disabled={!topics.length} onClick={exportCsv}>
                <Download className="w-4 h-4" />
                Exportar planilha
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="grow text-sm">
              <span className="sr-only">Buscar pautas</span>
              <input
                className="input-base"
                placeholder="Buscar tema, abordagem ou canal…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar status"
              className="input-base w-auto"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {Object.entries(stages).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <button
                aria-pressed={view === "lista"}
                className={view === "lista" ? "btn-primary" : "btn-outline"}
                onClick={() => setView("lista")}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                aria-pressed={view === "calendario"}
                className={view === "calendario" ? "btn-primary" : "btn-outline"}
                onClick={() => setView("calendario")}
              >
                <CalendarDays className="h-4 w-4" />
                Calendário
              </button>
            </div>
          </div>
        </div>
        {!topics.length ? (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 mx-auto mb-3 text-violet-400" />
            <h4 className="font-semibold">
              {w.topics.length ? "Nenhuma pauta neste filtro" : "O mês começa com uma boa pauta"}
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              {w.topics.length
                ? "Altere a busca ou o status."
                : "Defina a direção do mês e traga os temas sugeridos pelo plano."}
            </p>
          </div>
        ) : view === "lista" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-950 text-white">
                <tr>
                  {["Publicação", "Pauta", "Função", "Formato", "Status", "Briefing"].map((v) => (
                    <th key={v} className="text-left px-4 py-3 whitespace-nowrap font-medium">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-violet-50/50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {date(t.publication)}
                      <span className="block text-xs text-muted-foreground">
                        {t.publicationTime}
                      </span>
                    </td>
                    <td className="px-4 py-4 min-w-52 max-w-sm">
                      <button
                        className="font-semibold text-left hover:underline"
                        onClick={() => setFocus(t)}
                      >
                        {t.theme || "Nova pauta"}
                      </button>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {t.approach || "Abordagem a definir"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-lg px-2 py-1 text-xs ${colors[t.purpose]}`}
                      >
                        {functions[t.purpose]}
                      </span>
                    </td>
                    <td className="px-4 py-4">{t.format ? formatNames[t.format] : "A definir"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{stages[t.status]}</td>
                    <td className="px-4 py-4">
                      <button className="btn-outline" onClick={() => setFocus(t)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[650px] gap-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground p-2">
                  {d}
                </div>
              ))}
              {calendarDays(w.month).map((day, i) => (
                <div
                  key={day ?? `blank-${i}`}
                  className={day ? "rounded-xl border min-h-28 p-2 bg-slate-50/60" : ""}
                >
                  {day && (
                    <>
                      <p className="text-xs font-semibold mb-2">{Number(day.slice(-2))}</p>
                      {topics
                        .filter((t) => t.publication === day)
                        .map((t) => (
                          <button
                            key={t.id}
                            className={`block w-full text-left text-xs rounded-lg p-2 mb-1 ${colors[t.purpose]}`}
                            onClick={() => setFocus(t)}
                          >
                            {t.publicationTime && <strong>{t.publicationTime} · </strong>}
                            {t.theme || "Nova pauta"}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5">
              <h4 className="text-sm font-semibold mb-2">Sem data neste mês</h4>
              <div className="flex flex-wrap gap-2">
                {topics
                  .filter((t) => !t.publication.startsWith(w.month))
                  .map((t) => (
                    <button key={t.id} className="btn-outline" onClick={() => setFocus(t)}>
                      {t.theme || "Nova pauta"}
                    </button>
                  ))}
                {topics.every((t) => t.publication.startsWith(w.month)) && (
                  <p className="text-sm text-muted-foreground">
                    Todas as pautas têm data neste mês.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <p className="px-5 py-3 text-xs text-muted-foreground border-t">
          Horários locais do cliente. Exportação CSV compatível com Excel; respeita os filtros
          atuais.
        </p>
      </section>
      <Dialog
        open={!!focus}
        onOpenChange={(open) => {
          if (!open) setFocus(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{focus?.theme || "Briefing da pauta"}</DialogTitle>
            <DialogDescription>
              {focus && `${functions[focus.purpose]} · ${stages[focus.status]}`}
            </DialogDescription>
          </DialogHeader>
          {focus && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ["Abordagem", focus.approach],
                  ["Público", focus.audience],
                  ["Problema ou desejo", focus.need],
                  ["Mensagem principal", focus.message],
                  ["CTA", focus.cta],
                  ["Material necessário", focus.materials],
                  ["Responsável", focus.owner],
                  ["Publicação", `${date(focus.publication)} ${focus.publicationTime}`],
                  ["Prazo de produção", date(focus.productionDue)],
                  ["Prazo de aprovação", date(focus.approvalDue)],
                  ["Hipótese de teste", focus.testHypothesis],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm whitespace-pre-wrap">{value || "A definir"}</p>
                  </div>
                ))}
              </div>
              {focus.copy && (
                <details>
                  <summary className="font-medium cursor-pointer">Roteiro e texto da peça</summary>
                  <p className="text-sm whitespace-pre-wrap mt-3">{focus.copy}</p>
                </details>
              )}
              {canEdit && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    onEdit(focus);
                    setFocus(null);
                  }}
                >
                  Continuar na etapa da pauta
                </button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
