// src/utils/imageConverter.ts
import heic2any from "heic2any";

export type ImageTargetFormat = "png" | "jpeg" | "webp";

/**
 * Detecta se o arquivo é HEIC/HEIF (iPhone)
 */
export function isHeic(file: File) {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return (
    t === "image/heic" ||
    t === "image/heif" ||
    n.endsWith(".heic") ||
    n.endsWith(".heif")
  );
}

function getMime(format: ImageTargetFormat) {
  if (format === "png") return "image/png";
  if (format === "jpeg") return "image/jpeg";
  return "image/webp";
}

function clampQuality(q: number) {
  if (Number.isNaN(q)) return 0.85;
  return Math.min(1, Math.max(0.1, q));
}

/**
 * Converte uma imagem para PNG/JPEG/WebP no navegador.
 * - HEIC/HEIF é convertido primeiro para PNG via heic2any
 * - Depois renderiza em canvas e exporta no formato alvo
 *
 * onProgress: 0..100
 */
export async function convertImage(
  file: File,
  format: ImageTargetFormat,
  options?: {
    quality?: number; // para jpeg/webp
    maxWidth?: number; // redimensiona se maior
    maxHeight?: number;
    onProgress?: (p: number, msg?: string) => void;
  }
): Promise<Blob> {
  const onProgress = options?.onProgress;

  onProgress?.(5, "Lendo arquivo...");

  // 1) Se for HEIC/HEIF, converte para PNG primeiro
  let workingBlob: Blob = file;
  if (isHeic(file)) {
    onProgress?.(15, "Convertendo HEIC → PNG...");
    const converted = await heic2any({
      blob: file,
      toType: "image/png",
    });
    workingBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  // 2) Cria ImageBitmap (mais rápido que <img> em muitos casos)
  onProgress?.(35, "Carregando imagem...");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(workingBlob);
  } catch {
    // fallback com <img>
    const url = URL.createObjectURL(workingBlob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context não disponível");
      ctx.drawImage(img, 0, 0);

      // converte canvas -> blob
      onProgress?.(80, "Exportando...");
      const mime = getMime(format);
      const quality = clampQuality(options?.quality ?? 0.85);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Falha ao exportar"))),
          mime,
          format === "png" ? undefined : quality
        );
      });

      onProgress?.(100, "Pronto!");
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // 3) Redimensionamento (se pedido)
  const maxW = options?.maxWidth ?? 0;
  const maxH = options?.maxHeight ?? 0;

  let targetW = bitmap.width;
  let targetH = bitmap.height;

  if (maxW > 0 || maxH > 0) {
    const wLimit = maxW > 0 ? maxW : bitmap.width;
    const hLimit = maxH > 0 ? maxH : bitmap.height;

    const ratio = Math.min(wLimit / bitmap.width, hLimit / bitmap.height, 1);
    targetW = Math.round(bitmap.width * ratio);
    targetH = Math.round(bitmap.height * ratio);
  }

  // 4) Desenha no canvas e exporta
  onProgress?.(70, "Renderizando...");
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context não disponível");

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  onProgress?.(85, "Exportando...");
  const mime = getMime(format);
  const quality = clampQuality(options?.quality ?? 0.85);

  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao exportar"))),
      mime,
      format === "png" ? undefined : quality
    );
  });

  onProgress?.(100, "Pronto!");
  return out;
}

export function buildOutputName(file: File, format: ImageTargetFormat) {
  const base = file.name.replace(/\.[^.]+$/i, "");
  const ext = format === "jpeg" ? "jpg" : format;
  return `${base}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  if (bytes < k * k) return (bytes / k).toFixed(2) + " KB";
  return (bytes / (k * k)).toFixed(2) + " MB";
}
