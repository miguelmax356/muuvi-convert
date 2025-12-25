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

// ✅ PPTX no browser
import PptxGenJS from "pptxgenjs";

export interface PDFContent {
  textByPage: string[];
  pageImages: Blob[]; // PNG de cada página (render)
}

export type ProgressCb = (progress: number, msg?: string) => void;

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

  const total = pdf.numPages;

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);

    onProgress?.(
      Math.min(99, Math.round(((pageNum - 1) / total) * 100)),
      `Lendo página ${pageNum} de ${total}...`
    );

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
      scale: 2, // 2 = bom; 3 = mais pesado
      background: "#FFFFFF",
    });
    pageImages.push(pngBlob);

    onProgress?.(
      Math.min(99, Math.round((pageNum / total) * 100)),
      `Renderizando página ${pageNum} de ${total}...`
    );
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

  if (!ctx) throw new Error("Canvas 2D context não disponível.");

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
export const convertPDFToWord = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  const content = await extractPDFContent(file, (p, msg) => {
    onProgress?.(Math.min(95, p), msg);
  });

  onProgress?.(96, "Montando Word...");

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

    const progress = Math.round(((i + 1) / content.pageImages.length) * 3) + 96; // 96..99
    onProgress?.(Math.min(99, progress), `Finalizando página ${pageNumber}...`);
  }

  if (children.length === 0) {
    children.push(new Paragraph({ text: "Conteúdo do PDF convertido." }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  onProgress?.(100, "Arquivo pronto para baixar!");
  return blob;
};

/**
 * Converte PDF → Excel (texto).
 * Observação: Excel com imagens é possível, mas é outra implementação (mais complexa).
 */
export const convertPDFToExcel = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  const content = await extractPDFContent(file, (p, msg) => {
    onProgress?.(Math.min(90, p), msg);
  });

  onProgress?.(92, "Montando Excel...");

  const workbook = XLSX.utils.book_new();
  const wsData: string[][] = [["Conteúdo do PDF (texto)"]];

  content.textByPage.forEach((pageText, idx) => {
    wsData.push([`--- Página ${idx + 1} ---`]);
    if (!pageText?.trim()) {
      wsData.push(["(Sem texto extraído nesta página)"]);
      wsData.push([""]);
      return;
    }

    // quebra por “sentenças” só pra organizar
    const lines = pageText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    lines.forEach((line) => wsData.push([line]));
    wsData.push([""]);

    const p = 92 + Math.round(((idx + 1) / content.textByPage.length) * 7); // 92..99
    onProgress?.(Math.min(99, p), `Organizando página ${idx + 1}...`);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  worksheet["!cols"] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Conteúdo");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  onProgress?.(100, "Arquivo pronto para baixar!");
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

// ============================
// ✅ PDF → PPTX (VISUAL)
// ============================

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler imagem do PDF."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function getImageSize(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () =>
      reject(new Error("Falha ao carregar imagem renderizada."));
    img.src = dataUrl;
  });
}

function fitContain(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { x: number; y: number; w: number; h: number } {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;

  let w = boxW;
  let h = boxH;

  if (imgRatio > boxRatio) {
    // imagem “mais larga” -> limita pela largura
    w = boxW;
    h = w / imgRatio;
  } else {
    // imagem “mais alta” -> limita pela altura
    h = boxH;
    w = h * imgRatio;
  }

  const x = (boxW - w) / 2;
  const y = (boxH - h) / 2;

  return { x, y, w, h };
}

/**
 * PDF → PPTX (visual)
 * Cada página do PDF vira 1 slide com a imagem renderizada (mantém o visual).
 */
export const convertPDFToPPTVisual = async (
  file: File,
  onProgress?: ProgressCb
): Promise<Blob> => {
  const content = await extractPDFContent(file, (p, msg) => {
    onProgress?.(Math.min(85, p), msg);
  });

  onProgress?.(86, "Montando PowerPoint (visual)...");

  // Widescreen padrão (16:9)
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // Dimensões do slide em polegadas no LAYOUT_WIDE:
  // (pptx usa inches internamente)
  const slideW = 13.333; // ~13.33
  const slideH = 7.5;

  const total = content.pageImages.length;

  for (let i = 0; i < total; i++) {
    const n = i + 1;
    onProgress?.(
      Math.min(99, 86 + Math.round((n / total) * 13)),
      `Criando slide ${n} de ${total}...`
    );

    const dataUrl = await blobToDataURL(content.pageImages[i]);
    const { width, height } = await getImageSize(dataUrl);

    const slide = pptx.addSlide();
    // fundo branco
    slide.background = { color: "FFFFFF" };

    // coloca a imagem “contida” no slide (sem distorcer)
    const rect = fitContain(width, height, slideW, slideH);

    slide.addImage({
      data: dataUrl, // ✅ dataURL funciona no browser
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
    });
  }

  onProgress?.(99, "Gerando arquivo PPTX...");

  // ✅ Browser-safe: gera ArrayBuffer e vira Blob
  const ab = await pptx.write("arraybuffer");
  const blob = new Blob([ab], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });

  onProgress?.(100, "Arquivo pronto para baixar!");
  return blob;
};
