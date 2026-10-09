import { useState } from "react";
import { STEPS } from "@/lib/questions";
import { readableValue, sourceLabel } from "@/lib/source-display";
const questions = Object.fromEntries(
  STEPS.flatMap((s) => s.questions.map((q) => [q.key, q.label])),
);
export function SourceList({
  sources,
}: {
  sources: { id: string; reference: string; value: string }[];
}) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(8);
  const rows = sources
    .filter((s) => !s.reference.endsWith("updated_at"))
    .map((s) => ({
      ...s,
      label: sourceLabel(s.reference, questions),
      text: readableValue(s.value),
    }))
    .filter(
      (s) =>
        s.text &&
        `${s.label} ${s.text}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
    );
  return (
    <div className="space-y-3 mt-3">
      <label className="block text-sm">
        Buscar nas referências
        <input
          className="input-base mt-1"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(8);
          }}
          placeholder="Pergunta ou informação"
        />
      </label>
      <p className="text-xs text-muted-foreground">{rows.length} informações disponíveis</p>
      {rows.slice(0, limit).map((s) => (
        <details key={s.id} className="border-b py-2">
          <summary className="cursor-pointer text-sm font-medium">{s.label}</summary>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{s.text}</p>
        </details>
      ))}
      {rows.length > limit && (
        <button className="btn-outline" onClick={() => setLimit(limit + 8)}>
          Mostrar mais referências ({rows.length - limit})
        </button>
      )}
      {!rows.length && (
        <p className="text-sm text-muted-foreground">Nenhuma referência encontrada.</p>
      )}
    </div>
  );
}
