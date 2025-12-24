import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { Document, Packer, Paragraph } from "docx";
import * as XLSX from "xlsx";

export interface PDFContent {
  text: string[];
  tables: Array<Array<string[]>>;
  images: Blob[];
}

export const extractPDFContent = async (file: File): Promise<PDFContent> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const text: string[] = [];
  const tables: Array<Array<string[]>> = [];
  const images: Blob[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .filter((item: any): item is any => "str" in item)
      .map((item: { str: any }) => item.str)
      .join(" ");

    if (pageText.trim()) text.push(pageText);
  }

  return { text, tables, images };
};

export const convertPDFToWord = async (file: File): Promise<Blob> => {
  const content = await extractPDFContent(file);

  const paragraphs: Paragraph[] = [];

  content.text.forEach((pageText) => {
    const lines = pageText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      paragraphs.push(
        new Paragraph({
          text: line,
          spacing: { line: 360, after: 200 },
        })
      );
    });

    paragraphs.push(new Paragraph({ text: "" }));
  });

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ text: "Conteúdo do PDF convertido" }));
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const blob = (Packer as any).toBlob
    ? await (Packer as any).toBlob(doc)
    : new Blob([await Packer.toBuffer(doc)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

  return blob;
};

export const convertPDFToExcel = async (file: File): Promise<Blob> => {
  const content = await extractPDFContent(file);
  const workbook = XLSX.utils.book_new();

  const wsData: string[][] = [["Conteúdo do PDF"]];

  content.text.forEach((pageText) => {
    const lines = pageText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    lines.forEach((line) => wsData.push([line]));
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  worksheet["!cols"] = [{ wch: 60 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Conteúdo");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
