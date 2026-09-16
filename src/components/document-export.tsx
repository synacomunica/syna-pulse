import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import type { BusinessDocument } from "@/lib/documents/model";
export function DocumentExport({
  load,
  disabled = false,
}: {
  load: () => Promise<BusinessDocument>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  async function download(format: "docx" | "pdf") {
    setBusy(format);
    try {
      const model = await load();
      const { exportBusinessDocument } = await import("@/lib/documents/render");
      await exportBusinessDocument(model, format);
      toast.success("Documento preparado para download.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível exportar o documento.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn-ghost"
        disabled={disabled || busy !== null}
        onClick={() => void download("docx")}
      >
        <FileDown className="h-4 w-4" />
        {busy === "docx" ? "Preparando Word…" : "Exportar Word / Google Docs"}
      </button>
      <button
        className="btn-ghost"
        disabled={disabled || busy !== null}
        onClick={() => void download("pdf")}
      >
        <FileDown className="h-4 w-4" />
        {busy === "pdf" ? "Preparando PDF…" : "Exportar PDF"}
      </button>
    </div>
  );
}
