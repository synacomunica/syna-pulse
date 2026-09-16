import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageNumber,
  Footer,
  AlignmentType,
} from "docx";
import { endDate, formatNames, type ScheduleDocument } from "./content-schedule";

const date = (value: string) => value.slice(0, 10).split("-").reverse().join("/");
const paragraph = (text: string) =>
  new Paragraph({
    children: text
      .split("\n")
      .flatMap((line, i) => [new TextRun({ text: line, ...(i ? { break: 1 } : {}) })]),
    spacing: { after: 120 },
  });
const field = (label: string, text: string) =>
  new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      ...text.split("\n").map((line, i) => new TextRun({ text: line, ...(i ? { break: 1 } : {}) })),
    ],
    spacing: { after: 120 },
  });
const heading = (
  text: string,
  level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2,
) => new Paragraph({ text, heading: level, keepNext: true });

export function buildScheduleDocument(source: ScheduleDocument) {
  const { content, request } = source;
  const cell = (text: string, header = false) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: header, size: 20 })],
          spacing: { after: 80 },
        }),
      ],
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
    });
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: "SYNA · PLANEJAMENTO DE CONTEÚDO", spacing: { after: 180 } }),
    new Paragraph({ text: content.titulo, heading: HeadingLevel.TITLE }),
    paragraph(source.client),
    field(
      "Período",
      `${date(request.startDate)} a ${date(endDate(request.startDate, request.days))}`,
    ),
    field(
      "Plano de origem",
      `Versão ${source.planVersion} · ${source.planStatus === "aprovado" ? "Aprovado" : "Rascunho — proposta a validar"}`,
    ),
    field("Plano atualizado em", date(source.sourceUpdatedAt)),
    field("Documento gerado em", date(source.generatedAt)),
    paragraph(
      "Proposta gerada por IA. Revisar informações, viabilidade, direitos dos materiais e textos antes de produzir ou publicar.",
    ),
    heading("Diretriz editorial", HeadingLevel.HEADING_1),
    paragraph(content.diretriz_editorial),
  ];
  if (content.alertas.length)
    children.push(
      heading("Pontos para revisão", HeadingLevel.HEADING_2),
      ...content.alertas.map(paragraph),
    );
  children.push(
    heading("Calendário de publicações", HeadingLevel.HEADING_1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ["Data", "Canal / formato", "Conteúdo"].map((value) => cell(value, true)),
        }),
        ...content.conteudos.map(
          (item, index) =>
            new TableRow({
              cantSplit: true,
              children: [
                cell(date(item.data)),
                cell(`${item.canal} · ${formatNames[item.formato]}`),
                cell(`${index + 1}. ${item.titulo}`),
              ],
            }),
        ),
      ],
    }),
  );
  content.conteudos.forEach((item, index) => {
    children.push(
      new Paragraph({
        text: `${index + 1}. ${item.titulo}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
      field("Publicação", `${date(item.data)} · ${item.canal} · ${formatNames[item.formato]}`),
      field("Objetivo", item.objetivo),
      field("Público e necessidade", `${item.publico} — ${item.necessidade}`),
      field("Evidências", (item.evidencia_ids ?? []).join("; ") || "A confirmar"),
      field("Destino e próximo passo", `${item.destino} — ${item.proximo_passo}`),
      field("Uso comercial", item.uso_comercial ?? "A confirmar"),
      field(
        "Dependências de aprovação",
        (item.dependencias_aprovacao ?? []).join("; ") || "Revisão humana",
      ),
      field("Item do escopo", item.scopeItemId || "Não confirmado"),
      field("Conexão com a estratégia", item.estrategia),
      field("Etapa 5A", item.etapa),
      field("Mensagem central", item.mensagem),
      field("Indicador de acompanhamento", item.kpi),
      heading("Direção de arte e produção", HeadingLevel.HEADING_2),
      paragraph(item.orientacao_visual),
      field("Acessibilidade", item.acessibilidade),
      field("Materiais necessários", item.materiais_necessarios.join("; ")),
    );
    if (item.formato === "video") {
      children.push(heading("Roteiro de vídeo", HeadingLevel.HEADING_2));
      item.cenas.forEach((scene, i) =>
        children.push(
          heading(`Cena ${i + 1} · ${scene.duracao}`, HeadingLevel.HEADING_2),
          field("Visual / enquadramento", scene.visual),
          field("Fala / narração", scene.fala),
          field("Texto na tela", scene.texto_tela),
          field("Áudio", scene.audio),
        ),
      );
    } else if (item.formato === "estatico")
      children.push(heading("Texto da arte", HeadingLevel.HEADING_2), paragraph(item.texto_arte));
    else
      item.cards.forEach((card, i) =>
        children.push(
          heading(`Card ${i + 1} · ${card.titulo}`, HeadingLevel.HEADING_2),
          field("Texto do card", card.texto),
          field("Composição visual", card.composicao),
        ),
      );
    children.push(
      heading("Legenda para publicação", HeadingLevel.HEADING_2),
      paragraph(item.legenda),
      field("Chamada para ação", item.cta),
    );
  });
  return new Document({
    creator: "Syna",
    title: content.titulo,
    description: `Cronograma de ${source.client}, plano v${source.planVersion}`,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "202020" },
          paragraph: { spacing: { line: 276, after: 120 } },
        },
        heading1: {
          run: { size: 32, bold: true, color: "202020" },
          paragraph: { spacing: { before: 240, after: 160 } },
        },
        heading2: {
          run: { size: 25, bold: true, color: "202020" },
          paragraph: { spacing: { before: 180, after: 100 } },
        },
        title: { run: { size: 40, bold: true, color: "202020" } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Syna · " }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export async function downloadSchedule(source: ScheduleDocument) {
  const blob = await Packer.toBlob(buildScheduleDocument(source));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cronograma-${source.client.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80)}-v${source.planVersion}-${source.request.startDate}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
