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
} from "lucide-react";

import { convertPDFToWord, convertPDFToExcel } from "../utils/pdfConverter";

export function PDFConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  const [conversionResult, setConversionResult] = useState<{
    format: "word" | "excel";
    blob: Blob;
    filename: string;
  } | null>(null);

  const canDownload = !!conversionResult && !isProcessing;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const acceptPDF = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") return;

    setSelectedFile(file);
    setConversionResult(null);
    setProgress(0);
    setProgressMsg("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptPDF(e.dataTransfer.files?.[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptPDF(e.target.files?.[0]);
  };

  const handleConvert = async (format: "word" | "excel") => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setConversionResult(null);
    setProgress(1);
    setProgressMsg("Iniciando...");

    try {
      let blob: Blob;
      let extension: string;

      if (format === "word") {
        extension = "docx";
        blob = await convertPDFToWord(selectedFile, (p, msg) => {
          setProgress(p);
          if (msg) setProgressMsg(msg);
        });
      } else {
        extension = "xlsx";
        blob = await convertPDFToExcel(selectedFile, (p, msg) => {
          setProgress(p);
          if (msg) setProgressMsg(msg);
        });
      }

      const filename = `${selectedFile.name.replace(
        /\.pdf$/i,
        ""
      )}.${extension}`;
      setConversionResult({ format, blob, filename });
      setProgress(100);
      setProgressMsg("Arquivo pronto para baixar!");
    } catch (error) {
      console.error("Conversion error:", error);
      setProgress(0);
      setProgressMsg("Erro ao converter. Tente outro PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!conversionResult) return;

    const url = URL.createObjectURL(conversionResult.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = conversionResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setSelectedFile(null);
    setConversionResult(null);
    setIsProcessing(false);
    setIsDragging(false);
    setProgress(0);
    setProgressMsg("");
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
          <span className="text-sm font-medium">Convertendo...</span>
        </div>
      );
    }
    if (conversionResult) {
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
        <span className="text-sm font-medium">Envie um PDF</span>
      </div>
    );
  }, [isProcessing, conversionResult]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* ✅ UM ÚNICO CONTAINER */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              PDF → Word / Excel
            </h2>
            <p className="text-gray-600 mt-1">
              Converta seu PDF diretamente no navegador.
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
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"
          }`}
        >
          <Upload className="w-14 h-14 mx-auto mb-4 text-blue-500" />
          <h3 className="text-xl font-semibold text-gray-700">
            Arraste seu PDF aqui
          </h3>
          <p className="text-gray-500 mt-2 mb-5">
            ou selecione do seu computador
          </p>

          <label className="inline-block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="cursor-pointer bg-blue-600 text-white px-7 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block">
              Selecionar PDF
            </span>
          </label>

          <p className="text-sm text-gray-400 mt-4">Formato suportado: PDF</p>
        </div>

        {/* Arquivo selecionado + ações */}
        {selectedFile && (
          <div className="mt-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-gray-800">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                onClick={reset}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                disabled={isProcessing}
                title="Remover arquivo"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Escolha o formato e aguarde. Se o PDF for escaneado (imagem), a
                extração pode vir vazia.
              </p>
            </div>

            {/* Botões converter */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => handleConvert("word")}
                disabled={isProcessing}
                className="flex items-center justify-center gap-3 p-5 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-7 h-7 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-800">
                    Converter para Word
                  </p>
                  <p className="text-sm text-gray-600">.docx</p>
                </div>
              </button>

              <button
                onClick={() => handleConvert("excel")}
                disabled={isProcessing}
                className="flex items-center justify-center gap-3 p-5 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileIcon className="w-7 h-7 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-800">
                    Converter para Excel
                  </p>
                  <p className="text-sm text-gray-600">.xlsx</p>
                </div>
              </button>
            </div>

            {/* Progresso */}
            {(isProcessing || progressMsg) && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{progressMsg || "Processando..."}</span>
                  <span>{progress ? `${progress}%` : ""}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Resultado + Download */}
            <div className="mt-6 flex flex-col md:flex-row gap-3">
              <button
                onClick={handleDownload}
                disabled={!canDownload}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  canDownload
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Download className="w-5 h-5" />
                {canDownload
                  ? "Baixar arquivo convertido"
                  : "Baixar (aguardando conversão)"}
              </button>

              <div className="flex-1 bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Arquivo de saída:</p>
                <p className="font-semibold text-gray-800">
                  {conversionResult?.filename || "—"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {conversionResult
                    ? `Tamanho: ${formatFileSize(conversionResult.blob.size)}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé (quando nada selecionado) */}
        {!selectedFile && (
          <div className="mt-6 text-sm text-gray-500">
            Dica: PDFs escaneados (imagem) geralmente precisam de OCR para
            extrair texto.
          </div>
        )}
      </div>
    </div>
  );
}
