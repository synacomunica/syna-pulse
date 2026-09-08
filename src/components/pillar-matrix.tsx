import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { PILLAR_LABEL, PRIORITY_LABEL, scoreStatus } from "@/lib/pillars";
import type { Pillar } from "@/lib/questions";
import { StatusBadge } from "@/components/score-badge";
import { formatScore } from "@/lib/format";

export interface PillarScoreRow {
  pillar: Pillar;
  final_score: number | null;
  auto_score: number | null;
  summary: string | null;
  strengths: string[];
  problems: string[];
  risks: string[];
  opportunities: string[];
  priority: string;
}

export function PillarRadar({ scores }: { scores: PillarScoreRow[] }) {
  const chartData = scores.map((s) => ({
    pilar: PILLAR_LABEL[s.pillar],
    nota: Number(s.final_score ?? s.auto_score ?? 0),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="pilar"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, 10]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Radar dataKey="nota" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PillarCard({ score, onEdit }: { score: PillarScoreRow; onEdit?: () => void }) {
  const value = score.final_score ?? score.auto_score;
  const status = scoreStatus(value);
  const barColor =
    status === "critico"
      ? "bg-destructive"
      : status === "atencao"
        ? "bg-warning"
        : status === "adequado"
          ? "bg-good"
          : "bg-strong";

  return (
    <article className="surface-card flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{PILLAR_LABEL[score.pillar]}</h3>
          <p className="text-xs text-muted-foreground">
            Prioridade {PRIORITY_LABEL[score.priority] ?? "Média"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-display text-3xl">{formatScore(value)}</p>
          <StatusBadge score={value} className="mt-1" />
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${barColor}`}
          style={{ width: `${((Number(value) || 0) / 10) * 100}%` }}
        />
      </div>

      {score.summary ? <p className="mt-4 text-sm text-muted-foreground">{score.summary}</p> : null}

      <div className="mt-4 space-y-3 text-sm">
        <ListBlock title="Pontos fortes" items={score.strengths} tone="text-strong" />
        <ListBlock title="Problemas" items={score.problems} tone="text-destructive" />
        <ListBlock title="Riscos" items={score.risks} tone="text-warning" />
        <ListBlock title="Oportunidades" items={score.opportunities} tone="text-primary" />
      </div>

      {onEdit ? (
        <button className="btn-ghost mt-5 self-start" onClick={onEdit}>
          Ajustar nota
        </button>
      ) : null}
    </article>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${tone}`}>{title}</p>
      <ul className="mt-1.5 space-y-1 text-muted-foreground">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-muted-foreground/50">—</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
