import type { MarketingPlanContent } from "./marketing-plan";
import { validateGovernance, type ScopeSnapshot, governanceSchema } from "./planning-policy";
export function reviewPlanContent(content: MarketingPlanContent, scope: ScopeSnapshot | null) {
  const g = governanceSchema.parse(content.governanca ?? {});
  const sourceIds = new Set(g.sources.map((s) => s.id));
  const issue = (id: string, question: string, actionIds: string[] = []) => {
    if (!g.issues.some((i) => i.id === id))
      g.issues.push({
        id,
        category: "qualidade",
        priority: "impede_decisao",
        question,
        sourceIds: [],
        actionIds,
        resolution: "",
      });
  };
  for (const [index, a] of content.acoes.entries()) {
    const basis = g.actions.find((b) => b.title === a.titulo);
    if (!basis)
      issue(`action-${index}`, `Vincular fundamento, condições e avaliação de ${a.titulo}.`);
    if (basis && (a.responsavel !== basis.owner || (a.prazo && a.prazo !== basis.endDate)))
      issue(
        `action-consistency-${index}`,
        `Harmonizar responsável e prazo entre plano e condições de ${a.titulo}.`,
        [basis.actionId],
      );
  }
  for (const [index, c] of content.canais.entries())
    if (
      !g.actions.some(
        (a) =>
          a.evidenceIds.some((id) => sourceIds.has(id)) &&
          (a.title.toLowerCase().includes(c.canal.toLowerCase()) ||
            content.acoes.some(
              (p) =>
                p.titulo === a.title &&
                `${p.descricao} ${p.estrategia}`.toLowerCase().includes(c.canal.toLowerCase()),
            )),
      )
    ) {
      const id = `channel-${index}`;
      if (!g.issues.some((i) => i.id === id))
        g.issues.push({
          id,
          category: "canal",
          priority: "melhora_precisao",
          question: `Confirmar vínculo do canal ${c.canal} a uma ação fundamentada; tratar demanda/custo como hipótese até medir.`,
          sourceIds: [],
          actionIds: [],
          resolution: "",
        });
    }
  const assertions = [
    content.resumo_estrategico,
    content.estrategia_central,
    content.aquisicao,
    content.conversao,
    ...content.conteudo_comunicacao.provas,
    ...content.acoes.map((a) => `${a.titulo}. ${a.descricao}`),
  ];
  const sensitive =
    /garanti(?:a|do|da)|sem custos? adiciona|economia de \d|retorno de \d|certificad[oa]|exclusiv[oa]|obrigat[oó]ri[oa]|multas?|lei \d|seguran[cç]a garantida/iu;
  for (const statement of assertions)
    if (sensitive.test(statement) && !g.claims.some((c) => c.text === statement))
      g.claims.push({ text: statement, evidenceIds: [], status: "pendente", consultationDate: "" });
  content.governanca = validateGovernance(g, scope);
  return content;
}
