import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Header,
  PageNumber,
  AlignmentType,
  ImageRun,
  TableOfContents,
  SectionType,
  Bookmark,
} from "docx";
import type { BusinessDocument, Block } from "./model";
import { chartSvg, dateText } from "./model";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

export const PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1701, left: 1701, right: 1134, bottom: 1134, header: 1134, footer: 1134 },
};
const displayDate = (model: BusinessDocument) => dateText(model.issuedAt);
const line = (text: string, label?: string) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    children: [
      ...(label ? [new TextRun({ text: `${label}: `, bold: true })] : []),
      ...text.split("\n").map((t, i) => new TextRun({ text: t, ...(i ? { break: 1 } : {}) })),
    ],
    spacing: { after: 120, line: 240 },
    widowControl: true,
  });
export function numberedBlocks(blocks: Block[]): Block[] {
  let prefix = "";
  let n = 0;
  return blocks.map((b) => {
    if (b.kind === "heading" && b.level < 3) {
      prefix = b.text.split(" ")[0] ?? "";
      n = 0;
    }
    return b.kind === "heading" && b.level === 3 ? { ...b, text: `${prefix}.${++n} ${b.text}` } : b;
  });
}
export async function buildWord(
  model: BusinessDocument,
  rasterize: (svg: string) => Promise<Uint8Array>,
) {
  const body: Paragraph[] = [];
  let chart = 0;
  for (const block of numberedBlocks(model.blocks)) {
    if (block.kind === "heading")
      body.push(
        new Paragraph({
          children: [
            new Bookmark({
              id: `sec-${block.text.split(" ")[0]?.replaceAll(".", "-")}`,
              children: [new TextRun(block.text)],
            }),
          ],
          heading:
            block.level === 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
          keepNext: true,
        }),
      );
    else if (block.kind === "text") body.push(line(block.text, block.label));
    else {
      chart++;
      body.push(
        line(
          `O Gráfico ${chart} apresenta as notas disponíveis em escala de zero a dez. N/D indica dado não disponível.`,
        ),
        new Paragraph({
          text: `Gráfico ${chart} — ${block.title}`,
          spacing: { before: 160, after: 80, line: 240 },
          keepNext: true,
        }),
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: await rasterize(chartSvg(block.values)),
              transformation: {
                width: 560,
                height: Math.round(((70 + block.values.length * 52) * 560) / 760),
              },
              altText: {
                title: block.title,
                description: block.values
                  .map((v) => `${v.label}: ${v.value ?? "não disponível"}`)
                  .join("; "),
                name: `grafico-${chart}`,
              },
            }),
          ],
          keepNext: true,
        }),
        new Paragraph({
          text: `Fonte: ${block.source}`,
          style: "Caption",
          spacing: { after: 180, line: 240 },
        }),
      );
    }
  }
  const center = (text: string, after = 240) =>
    new Paragraph({ text, alignment: AlignmentType.CENTER, spacing: { after, line: 240 } });
  const cover = [
    center("SYNA"),
    center(model.client, 1800),
    new Paragraph({
      text: model.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    center(model.reference),
    center(model.status),
    new Paragraph({
      text: "Documento estratégico elaborado a partir dos registros do sistema Syna para apoiar a análise e o planejamento de marketing.",
      indent: { left: 4535 },
      spacing: { before: 480, after: 1000, line: 240 },
    }),
    center(model.city || "Local não informado"),
    center(model.issuedAt.slice(0, 4)),
    line(`Emitido em ${displayDate(model)}. Fonte atualizada em ${dateText(model.updatedAt)}.`),
  ];
  return new Document({
    creator: "Syna",
    title: `${model.title} de ${model.client}`,
    description: model.reference,
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 24, color: "000000" },
          paragraph: { spacing: { line: 240, after: 120 } },
        },
        title: { run: { font: "Arial", size: 28, bold: true, color: "000000" } },
        heading1: {
          run: { font: "Arial", size: 24, bold: true, color: "000000" },
          paragraph: { spacing: { before: 280, after: 160 }, keepNext: true },
        },
        heading2: {
          run: { font: "Arial", size: 24, bold: true, color: "000000" },
          paragraph: { spacing: { before: 220, after: 120 }, keepNext: true },
        },
        heading3: {
          run: { font: "Arial", size: 24, italics: true, color: "000000" },
          paragraph: { spacing: { before: 160, after: 120 }, keepNext: true },
        },
      },
      paragraphStyles: [
        {
          id: "Caption",
          name: "Legenda",
          basedOn: "Normal",
          run: { font: "Arial", size: 20, color: "000000" },
          paragraph: { spacing: { line: 240 } },
        },
      ],
    },
    sections: [
      { properties: { page: PAGE }, children: cover },
      {
        properties: { type: SectionType.NEXT_PAGE, page: PAGE },
        children: [
          center("RESUMO"),
          line(model.abstract),
          line("marketing; diagnóstico; planejamento estratégico.", "Palavras-chave"),
        ],
      },
      {
        properties: { type: SectionType.NEXT_PAGE, page: PAGE },
        children: [
          center("SUMÁRIO"),
          new TableOfContents("Sumário", {
            hyperlink: true,
            headingStyleRange: "1-2",
            cachedEntries: model.blocks
              .filter(
                (b): b is Extract<Block, { kind: "heading" }> =>
                  b.kind === "heading" && b.level <= 2,
              )
              .map((b) => ({
                title: b.text,
                level: b.level,
                href: `sec-${b.text.split(" ")[0]?.replaceAll(".", "-")}`,
              })),
          }),
        ],
      },
      {
        properties: { type: SectionType.NEXT_PAGE, page: PAGE },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });
}
export function buildPdfDefinition(model: BusinessDocument): TDocumentDefinitions {
  let chart = 0;
  let firstBodyPage = Infinity;
  const body: Content[] = numberedBlocks(model.blocks).map((b): Content => {
    if (b.kind === "heading")
      return { text: b.text, style: `h${b.level}`, tocItem: b.level <= 2, margin: [0, 16, 0, 8] };
    if (b.kind === "text")
      return {
        text: [...(b.label ? [{ text: `${b.label}: `, bold: true }] : []), b.text],
        margin: [0, 0, 0, 6],
        alignment: "justify",
      };
    chart++;
    return {
      stack: [
        {
          text: `O Gráfico ${chart} apresenta as notas disponíveis em escala de zero a dez. N/D indica dado não disponível.`,
          margin: [0, 0, 0, 8],
        },
        { text: `Gráfico ${chart} — ${b.title}`, margin: [0, 0, 0, 6] },
        { svg: chartSvg(b.values), width: 453 },
        { text: `Fonte: ${b.source}`, fontSize: 10, margin: [0, 6, 0, 12] },
      ],
      unbreakable: true,
    };
  });
  if (body[0] && typeof body[0] === "object") Object.assign(body[0], { id: "body-start" });
  return {
    pageSize: "A4",
    pageMargins: [85.04, 85.04, 56.69, 56.69],
    defaultStyle: { font: "Roboto", fontSize: 12, lineHeight: 1, color: "#000000" },
    info: { title: `${model.title} de ${model.client}`, author: "Syna", subject: model.reference },
    styles: {
      title: { fontSize: 14, bold: true, alignment: "center" },
      h1: { fontSize: 12, bold: true },
      h2: { fontSize: 12, bold: true },
      h3: { fontSize: 12, italics: true },
    },
    header: (page) =>
      page < firstBodyPage
        ? { text: "" }
        : { text: String(page), alignment: "right", fontSize: 10, margin: [0, 56, 56.69, 0] },
    content: [
      { text: "SYNA", alignment: "center", margin: [0, 0, 0, 20] },
      { text: model.client, alignment: "center", margin: [0, 0, 0, 80] },
      { text: model.title, style: "title", margin: [0, 0, 0, 20] },
      { text: `${model.reference}\n${model.status}`, alignment: "center", margin: [0, 0, 0, 40] },
      {
        text: "Documento estratégico elaborado a partir dos registros do sistema Syna para apoiar a análise e o planejamento de marketing.",
        margin: [220, 0, 0, 55],
      },
      {
        text: `${model.city || "Local não informado"}\n${model.issuedAt.slice(0, 4)}`,
        alignment: "center",
        margin: [0, 0, 0, 25],
      },
      {
        text: `Emitido em ${displayDate(model)}. Fonte atualizada em ${dateText(model.updatedAt)}.`,
      },
      {
        text: "RESUMO",
        pageBreak: "before",
        alignment: "center",
        bold: true,
        margin: [0, 0, 0, 20],
      },
      { text: model.abstract, alignment: "justify", margin: [0, 0, 0, 15] },
      { text: "Palavras-chave: marketing; diagnóstico; planejamento estratégico." },
      {
        toc: {
          title: { text: "SUMÁRIO", alignment: "center", bold: true, margin: [0, 0, 0, 20] },
          textStyle: { fontSize: 11 },
          numberStyle: { fontSize: 11 },
        },
        pageBreak: "before",
      },
      { text: "", pageBreak: "before" },
      ...body,
    ],
    pageBreakBefore: (node, container) => {
      if (node.id === "body-start") firstBodyPage = node.pageNumbers?.[0] ?? Infinity;
      return Boolean(
        node.style &&
        ["h1", "h2", "h3"].includes(String(node.style)) &&
        container.getFollowingNodesOnPage().length === 0,
      );
    },
  };
}
async function rasterize(svg: string): Promise<Uint8Array> {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível preparar o gráfico."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.width * 2;
    canvas.height = image.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gráficos indisponíveis neste navegador.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar gráfico."))),
        "image/png",
      ),
    );
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function exportBusinessDocument(model: BusinessDocument, format: "docx" | "pdf") {
  const filename = `${model.title}-${model.client}-${model.reference}`
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 150);
  let blob: Blob;
  if (format === "docx") blob = await Packer.toBlob(await buildWord(model, rasterize));
  else {
    const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    pdfMake.addVirtualFileSystem(fonts);
    blob = await pdfMake.createPdf(buildPdfDefinition(model)).getBlob();
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
