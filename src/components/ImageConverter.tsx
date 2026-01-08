// src/components/ImageConverter.tsx
import { useMemo, useState } from "react";
import {
  Upload,
  Download,
  Loader,
  Info,
  CheckCircle2,
  Image as ImageIcon,
  X,
  AlertTriangle,
} from "lucide-react";

import {
  convertImage,
  buildOutputName,
  formatBytes,
  ImageTargetFormat,
  isHeic,
} from "../utils/imageConverter";

type JobStatus = "idle" | "processing" | "done" | "error";

type FileJob = {
  id: string;
  file: File;
  status: JobStatus;
  progress: number;
  msg: string;
  result?: {
    format: ImageTargetFormat;
    blob: Blob;
    filename: string;
  };
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getNiceErrorMessage(err: unknown, file: File) {
  const anyErr = err as any;
  const rawMsg =
    typeof anyErr?.message === "string"
      ? anyErr.message
      : typeof anyErr === "string"
      ? anyErr
      : "Erro desconhecido";

  // Heic2any / libheif
  if (
    rawMsg.includes("ERR_LIBHEIF") ||
    rawMsg.toLowerCase().includes("libheif") ||
    rawMsg.toLowerCase().includes("heic")
  ) {
    // mensagem bem amigável
    return isHeic(file)
      ? "Este HEIC/HEIF não é compatível com conversão no navegador. Converta no iPhone para JPG/PNG e tente de novo."
      : "Falha ao decodificar imagem. Tente outro arquivo ou outro formato.";
  }

  if (rawMsg.toLowerCase().includes("toBlob")) {
    return "Falha ao exportar imagem no navegador. Tente JPG ou WebP.";
  }

  return rawMsg;
}

export function ImageConverter() {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [targetFormat, setTargetFormat] = useState<ImageTargetFormat>("jpeg");
  const [quality, setQuality] = useState(0.85);

  const hasFiles = jobs.length > 0;
  const hasResults = jobs.some((j) => j.status === "done" && j.result);

  const canStart = hasFiles && !isProcessing;
  const canDownloadAll = hasResults && !isProcessing;

  const acceptImages = (files?: FileList | File[]) => {
    if (!files) return;

    const list = Array.from(files);

    // aceita image/* + heic por extensão
    const filtered = list.filter((f) => {
      const t = (f.type || "").toLowerCase();
      const n = (f.name || "").toLowerCase();
      if (t.startsWith("image/")) return true;
      return n.endsWith(".heic") || n.endsWith(".heif");
    });

    if (filtered.length === 0) return;

    setJobs((prev) => {
      const existing = new Set(
        prev.map((p) => `${p.file.name}_${p.file.size}`)
      );
      const next = [...prev];

      for (const f of filtered) {
        const key = `${f.name}_${f.size}`;
        if (existing.has(key)) continue;

        next.push({
          id: makeId(),
          file: f,
          status: "idle",
          progress: 0,
          msg: "",
        });
      }

      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptImages(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptImages(e.target.files || undefined);
    e.target.value = "";
  };

  const updateJob = (id: string, patch: Partial<FileJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const removeJob = (id: string) => {
    if (isProcessing) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const reset = () => {
    if (isProcessing) return;
    setJobs([]);
    setIsProcessing(false);
    setIsDragging(false);
  };

  const convertOne = async (job: FileJob) => {
    updateJob(job.id, {
      status: "processing",
      progress: 1,
      msg: "Iniciando...",
    });

    try {
      const blob = await convertImage(job.file, targetFormat, {
        quality,
        onProgress: (p, msg) =>
          updateJob(job.id, {
            progress: Math.min(100, Math.max(0, p)),
            msg: msg || "",
          }),
      });

      const filename = buildOutputName(job.file, targetFormat);

      updateJob(job.id, {
        status: "done",
        progress: 100,
        msg: "Arquivo pronto para baixar!",
        result: { format: targetFormat, blob, filename },
      });
    } catch (err) {
      console.error("Image conversion error:", err);
      updateJob(job.id, {
        status: "error",
        progress: 0,
        msg: getNiceErrorMessage(err, job.file),
        result: undefined,
      });
    }
  };

  /**
   * Converte em FILA (um por vez), e NÃO para o lote em caso de erro.
   */
  const handleConvertAll = async () => {
    if (!canStart) return;

    setIsProcessing(true);

    // limpa resultados anteriores
    setJobs((prev) =>
      prev.map((j) => ({
        ...j,
        status: "idle",
        progress: 0,
        msg: "",
        result: undefined,
      }))
    );

    // snapshot ids (fila)
    const ids = jobs.map((j) => j.id);

    for (const id of ids) {
      // pega job mais recente pelo state
      const current = (prev: FileJob[]) => prev.find((x) => x.id === id);

      // eslint-disable-next-line no-await-in-loop
      const job = current(jobs);
      if (!job) continue;

      // eslint-disable-next-line no-await-in-loop
      await convertOne(job);
    }

    setIsProcessing(false);
  };

  const handleDownload = (job: FileJob) => {
    if (!job.result || job.status !== "done") return;

    const url = URL.createObjectURL(job.result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    if (!canDownloadAll) return;

    const doneJobs = jobs.filter((j) => j.status === "done" && j.result);

    for (const j of doneJobs) {
      handleDownload(j);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const statusBadge = useMemo(() => {
    if (isProcessing) {
      return (
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Processando...</span>
        </div>
      );
    }
    if (hasResults) {
      return (
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Concluído</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">
        <Info className="w-4 h-4" />
        <span className="text-sm font-medium">Envie imagens</span>
      </div>
    );
  }, [isProcessing, hasResults]);

  const hasHeic = useMemo(() => jobs.some((j) => isHeic(j.file)), [jobs]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 shadow-lg">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                Imagens{" "}
                <span className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-700 bg-clip-text text-transparent">
                  PNG • JPG • WebP • HEIC
                </span>
              </h2>
              <p className="text-gray-600 mt-1">
                Converta várias imagens de uma vez, direto no navegador.
              </p>
            </div>
            {statusBadge}
          </div>

          {/* Aviso HEIC (importante e realista) */}
          {hasHeic && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <b>Atenção:</b> alguns arquivos HEIC/HEIF (iPhone) podem não ser
                suportados para conversão no navegador. Se falhar, converta no
                iPhone para JPG/PNG e envie novamente.
              </div>
            </div>
          )}

          {/* Config */}
          <div className="grid md:grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-2">Formato de saída</p>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                value={targetFormat}
                onChange={(e) =>
                  setTargetFormat(e.target.value as ImageTargetFormat)
                }
                disabled={isProcessing}
              >
                <option value="jpeg">JPG (JPEG)</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 md:col-span-2">
              <p className="text-sm text-gray-600 mb-2">
                Qualidade (JPG/WebP): <b>{Math.round(quality * 100)}%</b>
              </p>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={isProcessing || targetFormat === "png"}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">
                PNG ignora qualidade (sempre sem perdas). JPG/WebP: menor
                arquivo com pequena perda.
              </p>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-3 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
              isDragging
                ? "border-violet-500 bg-violet-50 scale-[1.01]"
                : "border-orange-300 bg-white hover:border-pink-400 hover:bg-pink-50/40"
            }`}
          >
            <ImageIcon className="w-14 h-14 mx-auto mb-4 text-pink-500" />
            <h3 className="text-xl font-semibold text-gray-700">
              Arraste suas imagens aqui
            </h3>
            <p className="text-gray-500 mt-2 mb-5">
              ou selecione do seu computador
            </p>

            <label className="inline-block">
              <input
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600 text-white px-7 py-3 rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all inline-block">
                Selecionar imagens
              </span>
            </label>

            <p className="text-sm text-gray-400 mt-4">
              Suporta: JPG, PNG, WebP e HEIC/HEIF (quando compatível)
            </p>
          </div>

          {/* Lista */}
          {jobs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={handleConvertAll}
                  disabled={!canStart}
                  className="flex-1 flex items-center justify-center gap-3 p-5 border-2 border-purple-200 rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-6 h-6 text-purple-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">
                      Converter todas as imagens
                    </p>
                    <p className="text-sm text-gray-600">
                      saída:{" "}
                      {targetFormat === "jpeg"
                        ? "JPG"
                        : targetFormat.toUpperCase()}
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleDownloadAll}
                  disabled={!canDownloadAll}
                  className={`flex-1 flex items-center justify-center gap-3 p-5 rounded-xl transition-colors ${
                    canDownloadAll
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Download className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-semibold">Baixar todas prontas</p>
                    <p className="text-sm opacity-90">downloads sequenciais</p>
                  </div>
                </button>

                <button
                  onClick={reset}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Limpar
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {jobs.map((j) => (
                  <div key={j.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {j.file.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatBytes(j.file.size)} •{" "}
                          {j.status === "idle"
                            ? "Aguardando"
                            : j.status === "processing"
                            ? "Processando"
                            : j.status === "done"
                            ? "Concluído"
                            : "Erro"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(j)}
                          disabled={j.status !== "done" || !j.result}
                          className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                            j.status === "done" && j.result
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          Baixar
                        </button>

                        <button
                          onClick={() => removeJob(j.id)}
                          disabled={isProcessing}
                          className="px-3 py-2 rounded-lg bg-white text-gray-500 hover:text-gray-800 border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {j.status === "done" && j.result ? (
                      <button onClick={() => handleDownload(j)} className="...">
                        <Download className="w-4 h-4" />
                        Baixar
                      </button>
                    ) : j.status === "error" ? (
                      <div className="text-xs text-rose-700 font-semibold px-3 py-2">
                        Não foi possível converter
                      </div>
                    ) : (
                      <button disabled className="...">
                        <Download className="w-4 h-4" />
                        Baixar
                      </button>
                    )}

                    {j.status === "error" && (
                      <div className="mt-3 text-sm bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3">
                        {j.msg || "Erro ao converter."}
                      </div>
                    )}

                    {j.result && (
                      <div className="mt-2 text-sm text-gray-600">
                        Saída:{" "}
                        <span className="font-semibold text-gray-800">
                          {j.result.filename}
                        </span>{" "}
                        • {formatBytes(j.result.blob.size)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Observação: alguns navegadores podem bloquear muitos downloads
                automáticos. Para muitos arquivos, baixe um por um.
              </p>
            </div>
          )}

          {!hasFiles && (
            <div className="mt-6 text-sm text-gray-500">
              Dica: selecione várias imagens para converter em lote.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
