import { CLIENT_STATUS_LABEL } from "@/lib/pillars";

export const CLIENT_STATUSES = Object.keys(CLIENT_STATUS_LABEL);

export type ClientFormValues = Record<string, string | null | undefined>;

const FIELDS: { label: string; name: string; type?: string; required?: boolean }[] = [
  { label: "Nome da empresa", name: "company_name", required: true },
  { label: "Nome fantasia", name: "trade_name" },
  { label: "Segmento", name: "segment" },
  { label: "Categoria", name: "category" },
  { label: "CNPJ", name: "cnpj" },
  { label: "Cidade", name: "city" },
  { label: "Estado", name: "state" },
  { label: "Site", name: "website" },
  { label: "Instagram", name: "instagram" },
  { label: "WhatsApp", name: "whatsapp" },
  { label: "Contato principal", name: "contact_name" },
  { label: "Cargo do contato", name: "contact_role" },
  { label: "E-mail", name: "email", type: "email" },
  { label: "Telefone", name: "phone" },
  { label: "Data de início", name: "start_date", type: "date" },
];

export function ClientDialog({
  mode,
  initial,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  initial?: ClientFormValues;
  onClose: () => void;
  onSubmit: (payload: Record<string, string>) => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10">
      <form
        className="surface-card w-full max-w-2xl p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const obj: Record<string, string> = {};
          fd.forEach((v, k) => (obj[k] = String(v)));
          onSubmit(obj);
        }}
      >
        <h2 className="text-xl font-bold">
          {mode === "create" ? "Novo cliente" : "Editar cliente"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece pelo negócio: quem é a empresa antes de qualquer canal.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.name} className="block">
              <span className="mb-1.5 block text-sm font-medium">{f.label}</span>
              <input
                className="input-base"
                name={f.name}
                type={f.type ?? "text"}
                required={f.required}
                defaultValue={(initial?.[f.name] as string) ?? ""}
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Status</span>
            <select
              className="input-base"
              name="status"
              defaultValue={(initial?.["status"] as string) ?? "lead"}
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Observações</span>
          <textarea
            className="input-base"
            name="notes"
            rows={3}
            defaultValue={(initial?.["notes"] as string) ?? ""}
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Salvando..."
              : mode === "create"
                ? "Cadastrar cliente"
                : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function clientPayload(p: Record<string, string>) {
  const nullable = (k: string) => p[k]?.trim() || null;
  return {
    company_name: p["company_name"]!.trim(),
    trade_name: nullable("trade_name"),
    segment: nullable("segment"),
    category: nullable("category"),
    cnpj: nullable("cnpj"),
    city: nullable("city"),
    state: nullable("state"),
    website: nullable("website"),
    instagram: nullable("instagram"),
    whatsapp: nullable("whatsapp"),
    contact_name: nullable("contact_name"),
    contact_role: nullable("contact_role"),
    email: nullable("email"),
    phone: nullable("phone"),
    start_date: nullable("start_date"),
    notes: nullable("notes"),
    status: (p["status"] || "lead") as never,
  };
}
