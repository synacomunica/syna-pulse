import type { Question } from "@/lib/questions";

export function QuestionField({
  question,
  value,
  onChange,
  required = false,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  required?: boolean;
}) {
  const str = typeof value === "string" ? value : value == null ? "" : String(value);
  const arr = Array.isArray(value) ? (value as string[]) : [];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium leading-snug" htmlFor={question.key}>
        {question.label}
        {required ? <span className="ml-1 text-primary">*</span> : null}
      </label>
      {question.help ? <p className="text-xs text-muted-foreground">{question.help}</p> : null}

      {question.type === "textarea" ? (
        <textarea
          id={question.key}
          rows={3}
          className="input-base resize-y"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {question.type === "text" ? (
        <input
          id={question.key}
          className="input-base"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {question.type === "number" || question.type === "currency" ? (
        <input
          id={question.key}
          type="number"
          inputMode="decimal"
          step={question.type === "currency" ? "0.01" : "1"}
          className="input-base"
          placeholder={question.type === "currency" ? "R$ 0,00" : ""}
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      ) : null}

      {question.type === "select" ? (
        <select
          id={question.key}
          className="input-base"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione...</option>
          {(question.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : null}

      {question.type === "radio" ? (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                str === o
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : null}

      {question.type === "multi" ? (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((o) => {
            const on = arr.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
                className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
