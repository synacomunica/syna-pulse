export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  return `${formatNumber(value, digits)}%`;
}

export function formatMetric(value: number | null | undefined, format: string): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "ratio":
      return `${formatNumber(value, 1)}x`;
    default:
      return formatNumber(value);
  }
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(1).replace(".", ",");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function monthLabel(value: string): string {
  const d = new Date(`${value.slice(0, 7)}-01T12:00:00`);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "S";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
