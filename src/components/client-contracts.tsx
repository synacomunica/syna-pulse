import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { processContract, confirmScope } from "@/lib/client-scope.functions";
import { scopeSchema, scopeItemSchema, type Scope } from "@/lib/planning-policy";
import type { Tables } from "@/integrations/supabase/types";
const empty = () => scopeSchema.parse({});
export function ClientContracts({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const [scope, setScope] = useState<Scope>(empty);
  const [editing, setEditing] = useState(false);
  const [expected, setExpected] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [kind, setKind] = useState("contrato");
  const [replacement, setReplacement] = useState("");
  const [subject, setSubject] = useState("");
  const [value, setValue] = useState("");
  const [inputKind, setInputKind] = useState("resposta");
  const query = useQuery({
    queryKey: ["client-contracts", clientId],
    queryFn: async () => {
      const results = await Promise.all([
        supabase
          .from("client_documents")
          .select("*")
          .eq("client_id", clientId)
          .order("version", { ascending: false }),
        supabase
          .from("client_scopes")
          .select("*")
          .eq("client_id", clientId)
          .order("version", { ascending: false }),
        supabase
          .from("client_planning_inputs")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
      ]);
      for (const r of results) if (r.error) throw r.error;
      return {
        documents: results[0].data ?? [],
        scopes: results[1].data ?? [],
        inputs: results[2].data ?? [],
      };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["client-contracts", clientId] });
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operação não concluída.");
    } finally {
      setBusy("");
    }
  }
  function edit(content: unknown, documentIds: string[]) {
    setScope(scopeSchema.parse(content));
    setDocs(documentIds);
    setExpected(query.data?.scopes[0]?.id ?? "");
    setEditing(true);
  }
  async function upload(file: File) {
    await run("Enviando PDF…", async () => {
      if (
        file.size > 10 * 1024 * 1024 ||
        !file.name.toLowerCase().endsWith(".pdf") ||
        new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-"
      )
        throw new Error("Envie um PDF válido de até 10 MB.");
      const id = crypto.randomUUID(),
        path = `${clientId}/${id}/document.pdf`;
      const { error } = await supabase.from("client_documents").insert({
        id,
        client_id: clientId,
        title: file.name,
        kind,
        replaces_id: replacement || null,
        storage_path: path,
        processing_status: "processando",
      });
      if (error) throw error;
      const result = await supabase.storage
        .from("client-contracts")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (result.error) {
        await supabase
          .from("client_documents")
          .update({
            processing_status: "falha",
            processing_error: "Upload não concluído; envie nova versão.",
          })
          .eq("id", id);
        throw result.error;
      }
      setBusy("Lendo PDF e preparando escopo provisório…");
      await processContract({ data: { documentId: id } });
      toast.success("Arquivo preservado. Confira a extração antes de utilizá-la.");
    });
  }
  async function download(d: Tables<"client_documents">) {
    await run("Preparando arquivo…", async () => {
      const { data, error } = await supabase.storage
        .from("client-contracts")
        .download(d.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.title;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  }
  return (
    <section className="surface-card p-6 space-y-4">
      <h2 className="text-lg font-bold">Contrato e escopo</h2>
      <p className="text-sm text-muted-foreground">
        Arquivos privados. A leitura por IA é provisória; confira trechos e quantidades. Correções
        no resumo não alteram o contrato. Novo aditivo não substitui automaticamente o escopo
        anterior.
      </p>
      {query.error && (
        <p role="alert">
          Não foi possível carregar contratos. Verifique as permissões ou a instalação do módulo.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label>
          Tipo
          <select className="input-base" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="contrato">Contrato</option>
            <option value="aditivo">Aditivo</option>
            <option value="complemento">Documento complementar</option>
          </select>
        </label>
        <label>
          Substitui (somente referência)
          <select
            className="input-base"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          >
            <option value="">Não substitui automaticamente</option>
            {query.data?.documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} · v{d.version}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        Anexar PDF (até 10 MB)
        <input
          aria-label="Anexar contrato PDF"
          className="input-base"
          type="file"
          accept="application/pdf,.pdf"
          disabled={!!busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      {busy && <p role="status">{busy}</p>}
      {query.data?.documents.map((d) => (
        <article key={d.id} className="rounded border p-3 space-y-2">
          <strong>
            {d.title} · v{d.version}
          </strong>
          <p className="text-sm">
            {d.kind} · {d.processing_status} · {d.status} · {d.valid_from || "Início não informado"}{" "}
            / {d.valid_until || "Fim não informado"}
          </p>
          {d.processing_error && <p role="alert">{d.processing_error}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={!!busy} onClick={() => void download(d)}>
              Consultar / baixar PDF
            </button>
            <button
              className="btn-ghost"
              disabled={!!busy}
              onClick={() =>
                void run("Lendo PDF…", async () => {
                  await processContract({ data: { documentId: d.id } });
                })
              }
            >
              Processar novamente
            </button>
            {d.extraction && (
              <button
                className="btn-ghost"
                onClick={() => {
                  if (editing && !confirm("Substituir o resumo ainda não salvo?")) return;
                  edit(d.extraction, [d.id]);
                }}
              >
                Conferir extração
              </button>
            )}
            {d.extraction && (
              <button
                className="btn-ghost"
                disabled={!!busy}
                onClick={() => {
                  const base = editing
                    ? scope
                    : scopeSchema.parse(query.data?.scopes[0]?.content ?? {});
                  const extra = scopeSchema.parse(d.extraction);
                  edit(
                    {
                      ...base,
                      items: [
                        ...base.items,
                        ...extra.items.filter((i) => !base.items.some((b) => b.id === i.id)),
                      ],
                      uncertainties: [
                        ...base.uncertainties,
                        ...extra.uncertainties,
                        "Conferir quais cláusulas este documento altera; preservar as demais.",
                      ],
                    },
                    [
                      ...new Set([
                        ...(editing ? docs : (query.data?.scopes[0]?.document_ids ?? [])),
                        d.id,
                      ]),
                    ],
                  );
                }}
              >
                Incorporar itens ao escopo atual
              </button>
            )}
            <select
              aria-label={`Situação de ${d.title}`}
              className="input-base max-w-44"
              disabled={!!busy}
              value={d.status}
              onChange={(e) =>
                void run("Atualizando situação…", async () => {
                  const { error } = await supabase
                    .from("client_documents")
                    .update({ status: e.target.value })
                    .eq("id", d.id);
                  if (error) throw error;
                })
              }
            >
              {["rascunho", "vigente", "encerrado", "substituido"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label>
              Início
              <input
                aria-label={`Início de ${d.title}`}
                type="date"
                defaultValue={d.valid_from ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== d.valid_from)
                    void run("Salvando vigência…", async () => {
                      const { error } = await supabase
                        .from("client_documents")
                        .update({ valid_from: e.target.value || null })
                        .eq("id", d.id);
                      if (error) throw error;
                    });
                }}
              />
            </label>
            <label>
              Fim
              <input
                aria-label={`Fim de ${d.title}`}
                type="date"
                defaultValue={d.valid_until ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== d.valid_until)
                    void run("Salvando vigência…", async () => {
                      const { error } = await supabase
                        .from("client_documents")
                        .update({ valid_until: e.target.value || null })
                        .eq("id", d.id);
                      if (error) throw error;
                    });
                }}
              />
            </label>
          </div>
        </article>
      ))}
      <div className="flex gap-2 flex-wrap">
        <button className="btn-ghost" onClick={() => edit(empty(), [])}>
          Registrar escopo manual
        </button>
        {query.data?.scopes[0] && (
          <button
            className="btn-ghost"
            onClick={() =>
              edit(query.data!.scopes[0]!.content, query.data!.scopes[0]!.document_ids)
            }
          >
            Revisar escopo atual / aplicar aditivo
          </button>
        )}
      </div>
      {editing && (
        <div className="space-y-4 border rounded p-4">
          <h3 className="font-bold">Conferência do escopo</h3>
          <p className="text-sm">
            A versão salva será a referência para novos planos. Preserve os itens não alterados
            pelos aditivos. Itens ambíguos continuam pendentes mesmo após confirmar o resumo.
          </p>
          <fieldset>
            <legend>Documentos que sustentam esta versão</legend>
            {query.data?.documents.map((d) => (
              <label key={d.id} className="block">
                <input
                  type="checkbox"
                  checked={docs.includes(d.id)}
                  onChange={(e) =>
                    setDocs(e.target.checked ? [...docs, d.id] : docs.filter((id) => id !== d.id))
                  }
                />
                {d.title} · v{d.version}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-3">
            <label>
              Vigência inicial
              <input
                type="date"
                className="input-base"
                value={scope.validFrom}
                onChange={(e) => setScope({ ...scope, validFrom: e.target.value })}
              />
            </label>
            <label>
              Vigência final
              <input
                type="date"
                className="input-base"
                value={scope.validUntil}
                onChange={(e) => setScope({ ...scope, validUntil: e.target.value })}
              />
            </label>
          </div>
          {scope.items.map((item, index) => {
            const update = (key: string, value: unknown) =>
              setScope({
                ...scope,
                items: scope.items.map((x, i) => (i === index ? { ...x, [key]: value } : x)),
              });
            return (
              <fieldset className="border rounded p-3 space-y-2" key={item.id}>
                <legend>
                  Item {index + 1}: {item.service || "Novo serviço"}
                </legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["service", "Serviço"],
                    ["description", "Descrição / entrega"],
                    ["unit", "Unidade (publicações, vídeos...)"],
                    ["period", "Período exato (mês, semana...)"],
                    ["conditions", "Condições e dependências"],
                    ["capture", "Captação"],
                    ["travel", "Deslocamento"],
                    ["parentId", "ID do total que inclui esta entrega"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        className="input-base"
                        value={String(item[key as keyof typeof item] ?? "")}
                        onChange={(e) => update(key!, e.target.value)}
                      />
                    </label>
                  ))}
                  {[
                    ["quantity", "Limite máximo (até)"],
                    ["amount", "Valor R$"],
                    ["productionDays", "Dias para produção"],
                    ["approvalDays", "Dias para aprovação"],
                    ["revisionLimit", "Limite de alterações"],
                    ["page", "Página de origem"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        className="input-base"
                        type="number"
                        min="0"
                        value={String(item[key as keyof typeof item] ?? "")}
                        onChange={(e) =>
                          update(key!, e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    </label>
                  ))}
                  {(
                    [
                      [
                        "classification",
                        "Enquadramento",
                        ["incluido", "excluido", "nao_mencionado", "ambiguo"],
                      ],
                      [
                        "responsibility",
                        "Responsabilidade",
                        ["agencia", "cliente", "terceiro", "indefinido"],
                      ],
                      ["counting", "Contagem", ["independente", "incluido_no_total", "ambiguo"]],
                      [
                        "costType",
                        "Tipo de custo",
                        ["honorarios", "midia", "outro", "nao_informado"],
                      ],
                      ["origin", "Origem", ["contrato", "esclarecimento", "manual"]],
                    ] as [string, string, string[]][]
                  ).map(([key, label, options]) => (
                    <label key={key}>
                      {label}
                      <select
                        className="input-base"
                        value={String(item[key as keyof typeof item])}
                        onChange={(e) => update(key!, e.target.value)}
                      >
                        {options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label>
                    Documento
                    <select
                      className="input-base"
                      value={item.documentId}
                      onChange={(e) => update("documentId", e.target.value)}
                    >
                      <option value="">Manual / esclarecimento</option>
                      {query.data?.documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} · v{d.version}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(["channels", "formats"] as const).map((key) => (
                    <label key={key}>
                      {key === "channels" ? "Canais" : "Formatos (video, estatico, carrossel)"}
                      <input
                        className="input-base"
                        value={item[key].join(", ")}
                        onChange={(e) =>
                          update(
                            key!,
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="block">
                  Trecho literal / esclarecimento
                  <textarea
                    className="input-base"
                    value={item.excerpt}
                    onChange={(e) => update("excerpt", e.target.value)}
                  />
                </label>
                <small>ID: {item.id}</small>
                <label className="block">
                  <input
                    type="checkbox"
                    checked={item.confirmed}
                    onChange={(e) => update("confirmed", e.target.checked)}
                  />{" "}
                  Conferi este item e suas referências
                </label>
                <button
                  className="btn-ghost"
                  onClick={() =>
                    setScope({ ...scope, items: scope.items.filter((_, i) => i !== index) })
                  }
                >
                  Remover do resumo (arquivo preservado)
                </button>
              </fieldset>
            );
          })}
          <button
            className="btn-ghost"
            onClick={() =>
              setScope({
                ...scope,
                items: [...scope.items, scopeItemSchema.parse({ id: crypto.randomUUID() })],
              })
            }
          >
            Adicionar item / esclarecimento
          </button>
          <label className="block">
            Ambiguidades e pendências (uma por linha)
            <textarea
              className="input-base"
              value={scope.uncertainties.join("\n")}
              onChange={(e) =>
                setScope({ ...scope, uncertainties: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </label>
          <div className="flex gap-2">
            {[false, true].map((confirm) => (
              <button
                key={String(confirm)}
                className={confirm ? "btn-primary" : "btn-ghost"}
                disabled={!!busy}
                onClick={() =>
                  void run("Salvando nova versão do escopo…", async () => {
                    await confirmScope({
                      data: {
                        clientId,
                        expectedScopeId: expected,
                        documentIds: docs,
                        content: scope,
                        confirm,
                      },
                    });
                    setEditing(false);
                    toast.success(
                      "Nova versão preservada. Planos anteriores não foram modificados.",
                    );
                  })
                }
              >
                {confirm ? "Confirmar escopo conferido" : "Salvar provisório"}
              </button>
            ))}
          </div>
        </div>
      )}
      <details>
        <summary>Histórico de escopos ({query.data?.scopes.length ?? 0})</summary>
        {query.data?.scopes.map((s) => (
          <div className="p-2 border-b" key={s.id}>
            Versão {s.version} · {s.status} · {s.origin} ·{" "}
            {new Date(s.created_at).toLocaleString("pt-BR")}
            <button className="btn-ghost" onClick={() => edit(s.content, s.document_ids)}>
              Consultar / criar revisão
            </button>
          </div>
        ))}
      </details>
      <h3 className="font-bold">Respostas e decisões posteriores</h3>
      <p className="text-sm">
        Registre apenas mudanças relevantes. Serão fontes datadas; planos aprovados permanecem
        intactos.
      </p>
      <select
        aria-label="Tipo de informação"
        className="input-base"
        value={inputKind}
        onChange={(e) => setInputKind(e.target.value)}
      >
        {["resposta", "decisao", "briefing", "evidencia"].map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <input
        aria-label="Assunto da informação"
        placeholder="Assunto / pendência respondida"
        className="input-base"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        aria-label="Resposta ou decisão"
        className="input-base"
        placeholder="Informação, origem e condições da decisão"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className="btn-ghost"
        disabled={!!busy || !subject.trim() || !value.trim()}
        onClick={() =>
          void run("Registrando informação…", async () => {
            const { error } = await supabase
              .from("client_planning_inputs")
              .insert({ client_id: clientId, kind: inputKind, subject, value });
            if (error) throw error;
            setValue("");
            setSubject("");
          })
        }
      >
        Registrar informação
      </button>
      <details>
        <summary>Informações registradas</summary>
        {query.data?.inputs.map((i) => (
          <p key={i.id} className="p-2">
            <strong>{i.subject}</strong> · {new Date(i.created_at).toLocaleString("pt-BR")}
            <br />
            {i.value}
          </p>
        ))}
      </details>
    </section>
  );
}
