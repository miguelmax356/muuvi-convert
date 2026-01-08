// src/components/PDFConverter.tsx
import { useMemo, useState } from "react";
import {
  Upload,
  FileText,
  Download,
  File as FileIcon,
  Loader,
  Info,
  CheckCircle2,
  Presentation,
  FileArchive,
} from "lucide-react";

import {
  convertPDFToWord,
  convertPDFToExcel,
  convertPDFToPPTVisual,
  compressPDF,
} from "../utils/pdfConverter";

type ConvertFormat = "word" | "excel" | "ppt" | "compress";

type JobStatus = "idle" | "processing" | "done" | "error";

type FileJob = {
  id: string;
  file: File;
  status: JobStatus;
  progress: number; // 0..100
  msg: string;
  result?: {
    format: ConvertFormat;
    blob: Blob;
    filename: string;
  };
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function PDFConverter() {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const hasFiles = jobs.length > 0;

  const canStart = hasFiles && !isProcessing;
  const hasResults = jobs.some((j) => j.result && j.status === "done");
  const canDownloadAll = hasResults && !isProcessing;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const acceptPDFs = (files?: FileList | File[]) => {
    if (!files) return;

    const list = Array.from(files).filter((f) => f.type === "application/pdf");
    if (list.length === 0) return;

    setJobs((prev) => {
      // evita duplicar por nome+tamanho (simples)
      const existingKey = new Set(
        prev.map((p) => `${p.file.name}_${p.file.size}`)
      );
      const next = [...prev];

      for (const f of list) {
        const key = `${f.name}_${f.size}`;
        if (existingKey.has(key)) continue;

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptPDFs(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptPDFs(e.target.files || undefined);
    // permite selecionar o mesmo arquivo novamente depois
    e.target.value = "";
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

  const updateJob = (id: string, patch: Partial<FileJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const buildFilename = (file: File, format: ConvertFormat) => {
    const baseName = file.name.replace(/\.pdf$/i, "");
    if (format === "word") return `${baseName}.docx`;
    if (format === "excel") return `${baseName}.xlsx`;
    if (format === "ppt") return `${baseName}.pptx`;
    return `${baseName}.compressed.pdf`;
  };

  const convertOne = async (job: FileJob, format: ConvertFormat) => {
    updateJob(job.id, {
      status: "processing",
      progress: 1,
      msg: "Iniciando...",
    });

    try {
      let blob: Blob;

      const onProgress = (p: number, msg?: string) => {
        updateJob(job.id, {
          progress: Math.min(100, Math.max(0, p)),
          msg: msg || "",
        });
      };

      if (format === "word") {
        blob = await convertPDFToWord(job.file, onProgress);
      } else if (format === "excel") {
        blob = await convertPDFToExcel(job.file, onProgress);
      } else if (format === "ppt") {
        blob = await convertPDFToPPTVisual(job.file, onProgress);
      } else {
        blob = await compressPDF(job.file, onProgress);
      }

      const filename = buildFilename(job.file, format);

      updateJob(job.id, {
        status: "done",
        progress: 100,
        msg: "Arquivo pronto para baixar!",
        result: { format, blob, filename },
      });
    } catch (error) {
      console.error("Conversion error:", error);
      updateJob(job.id, {
        status: "error",
        progress: 0,
        msg: "Erro ao processar. Tente outro PDF.",
        result: undefined,
      });
    }
  };

  /**
   * Converte TODOS os PDFs em fila (um por vez).
   * Isso é muito mais estável do que rodar tudo em paralelo no browser.
   */
  const handleConvertAll = async (format: ConvertFormat) => {
    if (!canStart) return;

    setIsProcessing(true);

    // limpa resultados antigos (opcional)
    setJobs((prev) =>
      prev.map((j) => ({
        ...j,
        status: "idle",
        progress: 0,
        msg: "",
        result: undefined,
      }))
    );

    // pega snapshot da fila atual
    const queue = [...jobs];

    for (const job of queue) {
      // re-leitura do job “atual”
      const current = (prevJobs: FileJob[]) =>
        prevJobs.find((x) => x.id === job.id);

      // se o usuário removeu (não deve porque desabilita), só pula
      const stillExists = current(jobs);
      if (stillExists === undefined) continue;

      // converte
      // eslint-disable-next-line no-await-in-loop
      await convertOne(job, format);
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

  /**
   * Baixar todos:
   * alguns navegadores podem bloquear múltiplos downloads seguidos.
   * Funciona melhor com poucos arquivos.
   */
  const handleDownloadAll = async () => {
    if (!canDownloadAll) return;

    const doneJobs = jobs.filter((j) => j.status === "done" && j.result);

    for (const j of doneJobs) {
      handleDownload(j);
      // pequeno delay pra não “atropelar” o browser
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    if (bytes < k * k) return (bytes / k).toFixed(2) + " KB";
    return (bytes / (k * k)).toFixed(2) + " MB";
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
        <span className="text-sm font-medium">Envie PDFs</span>
      </div>
    );
  }, [isProcessing, hasResults]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* ✅ UM ÚNICO CONTAINER */}
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 shadow-lg">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                PDF{" "}
                <span className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-700 bg-clip-text text-transparent">
                  Word • Excel • PPT • Compressão
                </span>
              </h2>

              <p className="text-gray-600 mt-1">
                Converta e compacte seus PDFs diretamente no navegador.
              </p>
            </div>
            {statusBadge}
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
            <Upload className="w-14 h-14 mx-auto mb-4 text-pink-500" />

            <h3 className="text-xl font-semibold text-gray-700">
              Arraste seus PDFs aqui
            </h3>
            <p className="text-gray-500 mt-2 mb-5">
              ou selecione do seu computador
            </p>

            <label className="inline-block">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="cursor-pointer bg-gradient-to-r from-violet-600 to-purple-600 text-white px-7 py-3 rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all inline-block">
                Selecionar PDFs
              </span>
            </label>

            <p className="text-sm text-gray-400 mt-4">Formato suportado: PDF</p>
          </div>

          {/* Lista de arquivos + ações */}
          {hasFiles && (
            <div className="mt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 flex-1">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    • Word/Excel tentam extrair texto. <br />•{" "}
                    <b>PDF → PPT (visual)</b>: cada página vira um slide
                    mantendo o visual. <br />• <b>Comprimir PDF</b>: tenta
                    reduzir tamanho sem perder qualidade (quando possível).
                  </p>
                </div>

                <button
                  onClick={reset}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Limpar tudo"
                >
                  Limpar
                </button>
              </div>

              {/* Botões de converter TODOS */}
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <button
                  onClick={() => handleConvertAll("word")}
                  disabled={!canStart}
                  className="flex items-center justify-center gap-3 p-5 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-7 h-7 text-blue-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">
                      Converter TODOS para Word
                    </p>
                    <p className="text-sm text-gray-600">.docx</p>
                  </div>
                </button>

                <button
                  onClick={() => handleConvertAll("excel")}
                  disabled={!canStart}
                  className="flex items-center justify-center gap-3 p-5 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileIcon className="w-7 h-7 text-green-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">
                      Converter TODOS para Excel
                    </p>
                    <p className="text-sm text-gray-600">.xlsx</p>
                  </div>
                </button>

                <button
                  onClick={() => handleConvertAll("ppt")}
                  disabled={!canStart}
                  className="flex items-center justify-center gap-3 p-5 border-2 border-purple-200 rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Presentation className="w-7 h-7 text-purple-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">
                      PDF → PPT (visual) — TODOS
                    </p>
                    <p className="text-sm text-gray-600">.pptx (slides)</p>
                  </div>
                </button>

                <button
                  onClick={() => handleConvertAll("compress")}
                  disabled={!canStart}
                  className="flex items-center justify-center gap-3 p-5 border-2 border-amber-200 rounded-xl hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileArchive className="w-7 h-7 text-amber-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">
                      Comprimir TODOS os PDFs
                    </p>
                    <p className="text-sm text-gray-600">.pdf menor</p>
                  </div>
                </button>
              </div>

              {/* Lista de arquivos */}
              <div className="mt-5 space-y-3">
                {jobs.map((j) => (
                  <div
                    key={j.id}
                    className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-6 h-6 text-red-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">
                            {j.file.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(j.file.size)} •{" "}
                            {j.status === "idle"
                              ? "Aguardando"
                              : j.status === "processing"
                              ? "Processando"
                              : j.status === "done"
                              ? "Concluído"
                              : "Erro"}
                          </p>
                        </div>
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
                          title="Baixar"
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
                          ✕
                        </button>
                      </div>
                    </div>

                    {(j.status === "processing" || j.msg) && (
                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span className="truncate">
                            {j.msg || "Processando..."}
                          </span>
                          <span>{j.progress ? `${j.progress}%` : ""}</span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, j.progress)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {j.result && (
                      <div className="text-sm text-gray-600">
                        Saída:{" "}
                        <span className="font-semibold text-gray-800">
                          {j.result.filename}
                        </span>{" "}
                        • {formatFileSize(j.result.blob.size)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Download All */}
              <div className="mt-5">
                <button
                  onClick={handleDownloadAll}
                  disabled={!canDownloadAll}
                  className={`w-full py-3 rounded-xl font-extrabold transition-colors flex items-center justify-center gap-2 ${
                    canDownloadAll
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Download className="w-5 h-5" />
                  Baixar todos os arquivos prontos
                </button>

                <p className="text-xs text-gray-500 mt-2">
                  Observação: alguns navegadores podem bloquear muitos downloads
                  automáticos. Para muitos arquivos, baixe um por um.
                </p>
              </div>
            </div>
          )}

          {!hasFiles && (
            <div className="mt-6 text-sm text-gray-500">
              Dica: você pode selecionar vários PDFs de uma vez. PDFs escaneados
              (imagem) geralmente precisam de OCR para extrair texto.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
