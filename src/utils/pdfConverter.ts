// src/utils/pdfConverter.ts
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  AlignmentType,
  PageBreak,
} from "docx";
import * as XLSX from "xlsx";

export interface PDFContent {
  textByPage: string[];
  pageImages: Blob[]; // PNG de cada página (render)
}

/**
 * Extrai texto + renderiza cada página do PDF como imagem (PNG).
 * Isso garante que PDFs “de slide” (PPT exportado) tragam as imagens.
 */
export const extractPDFContent = async (file: File): Promise<PDFContent> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textByPage: string[] = [];
  const pageImages: Blob[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // 1) Texto
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => (item?.str ? String(item.str) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    textByPage.push(pageText);

    // 2) Render da página como PNG (pega imagens, gráficos, slide inteiro)
    const pngBlob = await renderPageToPNG(page, {
      scale: 2, // aumenta qualidade (2 = bom; 3 = mais pesado)
      background: "#FFFFFF",
    });
    pageImages.push(pngBlob);
  }

  return { textByPage, pageImages };
};

type RenderOptions = {
  scale?: number;
  background?: string;
};

/**
 * Renderiza uma página do PDF para PNG Blob.
 * Funciona 100% no navegador.
 */
async function renderPageToPNG(
  page: any,
  options: RenderOptions = {}
): Promise<Blob> {
  const scale = options.scale ?? 2;
  const background = options.background ?? "#FFFFFF";

  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context não disponível.");
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  // fundo branco (importante para PDF com transparência)
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar PNG."))),
      "image/png",
      1
    );
  });

  return blob;
}

/**
 * Converte PDF → Word:
 * - Insere IMAGEM da página (captura slide inteiro)
 * - Insere texto extraído (se existir)
 *
 * Importante: usa Packer.toBlob() (browser) para evitar "nodebuffer not supported".
 */
export const convertPDFToWord = async (file: File): Promise<Blob> => {
  const content = await extractPDFContent(file);

  const children: Array<Paragraph> = [];

  for (let i = 0; i < content.pageImages.length; i++) {
    const pageNumber = i + 1;

    // Título simples por página
    children.push(
      new Paragraph({
        text: `Página ${pageNumber}`,
        spacing: { after: 200 },
      })
    );

    // IMAGEM da página
    const imgBytes = new Uint8Array(await content.pageImages[i].arrayBuffer());

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: imgBytes,
            transformation: {
              // Ajuste “tamanho no Word”.
              // Se ficar grande/pequeno, mexa aqui.
              width: 900,
              height: 780,
            },
          }),
        ],
        spacing: { after: 300 },
      })
    );

    // TEXTO (se existir)
    const pageText = (content.textByPage[i] ?? "").trim();
    if (pageText) {
      children.push(
        new Paragraph({
          text: pageText,
          spacing: { line: 360, after: 200 },
        })
      );
    }

    // quebra de página (menos na última)
    if (i < content.pageImages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // fallback se por algum motivo não gerou nada
  if (children.length === 0) {
    children.push(new Paragraph({ text: "Conteúdo do PDF convertido." }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  // ✅ Browser-safe
  const blob = await Packer.toBlob(doc);
  return blob;
};

/**
 * Converte PDF → Excel (texto).
 * Observação: Excel com imagens é possível, mas é outra implementação (mais complexa).
 */
export const convertPDFToExcel = async (file: File): Promise<Blob> => {
  const content = await extractPDFContent(file);

  const workbook = XLSX.utils.book_new();

  const wsData: string[][] = [["Conteúdo do PDF (texto)"]];

  content.textByPage.forEach((pageText, idx) => {
    wsData.push([`--- Página ${idx + 1} ---`]);
    if (!pageText?.trim()) {
      wsData.push(["(Sem texto extraído nesta página)"]);
      return;
    }

    // quebra por “sentenças” só pra organizar
    const lines = pageText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    lines.forEach((line) => wsData.push([line]));
    wsData.push([""]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  worksheet["!cols"] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Conteúdo");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
