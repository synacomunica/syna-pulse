import { cn } from "@/lib/utils";
import { scoreStatus, STATUS_LABEL, statusClasses } from "@/lib/pillars";
import { formatScore } from "@/lib/format";

export function StatusBadge({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const status = scoreStatus(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusClasses(status),
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ScoreDial({
  score,
  size = "md",
  label,
}: {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const status = scoreStatus(score);
  const pct = Math.max(0, Math.min(100, ((Number(score) || 0) / 10) * 100));
  const dim = size === "lg" ? 132 : size === "md" ? 96 : 68;
  const stroke = size === "lg" ? 10 : size === "md" ? 8 : 6;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color =
    status === "critico"
      ? "var(--critical)"
      : status === "atencao"
        ? "var(--warning)"
        : status === "adequado"
          ? "var(--good)"
          : "var(--strong)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * pct) / 100} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span
            className={cn(
              "text-display",
              size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-lg",
            )}
          >
            {formatScore(score)}
          </span>
        </div>
      </div>
      {label ? (
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
