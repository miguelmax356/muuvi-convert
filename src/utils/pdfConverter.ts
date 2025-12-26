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

// ✅ NOVO: PPTX visual
import PptxGenJS from "pptxgenjs";

// ✅ NOVO: compressão (best-effort, sem perder qualidade quando possível)
import { PDFDocument } from "pdf-lib";

export interface PDFContent {
  textByPage: string[];
  pageImages: Blob[]; // PNG de cada página (render)
}

type ProgressCb = (progress: number, msg?: string) => void;

/**
 * Extrai texto + renderiza cada página do PDF como imagem (PNG).
 * Isso garante que PDFs “de slide” (PPT exportado) tragam as imagens.
 */
export const extractPDFContent = async (
  file: File,
  onProgress?: ProgressCb
): Promise<PDFContent> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textByPage: string[] = [];
  const pageImages: Blob[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.(
      Math.round((pageNum / pdf.numPages) * 70),
      `Lendo página ${pageNum}/${pdf.numPages}...`
    );

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
      scale: 2, // qualidade boa
      background: "#FFFFFF",
    });
    pageImages.push(pngBlob);
  }

  onProgress?.(75, "Organizando conteúdo...");
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
 * Converte PDF → Word (visual + texto):
 * - Insere IMAGEM da página (captura slide inteiro)
 * - Insere texto extraído (se existir)
 *
 * Importante: usa Packer.toBlob() (browser) para evitar "nodebuffer not supported".
 */
export const convertPDFToWord = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  onProgress?.(1, "Preparando leitura do PDF...");
  const content = await extractPDFContent(file, onProgress);

  const children: Array<Paragraph> = [];

  for (let i = 0; i < content.pageImages.length; i++) {
    const pageNumber = i + 1;
    onProgress?.(
      75 + Math.round(((i + 1) / content.pageImages.length) * 20),
      `Montando Word (${pageNumber}/${content.pageImages.length})...`
    );

    // Título por página
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

  if (children.length === 0) {
    children.push(new Paragraph({ text: "Conteúdo do PDF convertido." }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  onProgress?.(98, "Finalizando Word...");
  const blob = await Packer.toBlob(doc);
  onProgress?.(100, "Word pronto!");
  return blob;
};

/**
 * Converte PDF → Excel (texto).
 */
export const convertPDFToExcel = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  onProgress?.(1, "Lendo PDF...");
  const content = await extractPDFContent(file, onProgress);

  onProgress?.(80, "Montando planilha...");
  const workbook = XLSX.utils.book_new();

  const wsData: string[][] = [["Conteúdo do PDF (texto)"]];

  content.textByPage.forEach((pageText, idx) => {
    wsData.push([`--- Página ${idx + 1} ---`]);
    if (!pageText?.trim()) {
      wsData.push(["(Sem texto extraído nesta página)"]);
      wsData.push([""]);
      return;
    }

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

  onProgress?.(95, "Gerando arquivo Excel...");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  onProgress?.(100, "Excel pronto!");
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

/**
 * ✅ NOVO — PDF → PPT (visual):
 * Cada página vira 1 slide, mantendo o visual original (render em imagem).
 */
export const convertPDFToPPTVisual = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  onProgress?.(1, "Renderizando páginas do PDF (visual)...");
  const content = await extractPDFContent(file, onProgress);

  onProgress?.(80, "Montando PPTX...");
  const pptx = new PptxGenJS();

  // Layout widescreen (16:9) — fica com cara de apresentação
  pptx.layout = "LAYOUT_WIDE";

  // Tamanho padrão em polegadas para 16:9 no pptxgenjs (13.333 x 7.5)
  const SLIDE_W = 13.333;
  const SLIDE_H = 7.5;

  for (let i = 0; i < content.pageImages.length; i++) {
    onProgress?.(
      80 + Math.round(((i + 1) / content.pageImages.length) * 18),
      `Criando slide ${i + 1}/${content.pageImages.length}...`
    );

    const slide = pptx.addSlide();

    // Converter Blob PNG para dataURL
    const dataUrl = await blobToDataURL(content.pageImages[i]);

    // Colocar imagem preenchendo o slide (visual “perfeito”)
    slide.addImage({
      data: dataUrl,
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
    });
  }

  onProgress?.(99, "Finalizando PPTX...");
  // Browser: retorna ArrayBuffer
  const arrayBuffer = await pptx.write("arraybuffer");
  onProgress?.(100, "PPTX pronto!");

  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
};

async function blobToDataURL(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 * ✅ NOVO — Comprimir PDF (best-effort, “lossless” quando possível):
 * - Re-salva o PDF com estruturas mais compactas (object streams)
 * - Remove metadados comuns
 *
 * Observação honesta: PDFs que já estão otimizados podem reduzir pouco
 * ou até ficar iguais. A integridade do conteúdo é mantida.
 */
export const compressPDF = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  onProgress?.(1, "Abrindo PDF para otimização...");
  const inputBytes = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(inputBytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  onProgress?.(35, "Removendo metadados e otimizando estruturas...");

  // “limpa” metadados (mantém documento ok; evita inchados)
  try {
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");
  } catch {
    // se algum PDF não permitir, seguimos
  }

  onProgress?.(70, "Regerando PDF compactado (sem perder qualidade)...");
  const outBytes = await pdfDoc.save({
    useObjectStreams: true, // melhora compressão estrutural
    addDefaultPage: false,
    // compressão interna de streams é aplicada pelo pdf-lib quando possível
  });

  onProgress?.(100, "PDF comprimido pronto!");
  return new Blob([outBytes], { type: "application/pdf" });
};
