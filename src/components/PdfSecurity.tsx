import { useState } from "react";
import { Upload, Lock, Unlock, Download, X, Info } from "lucide-react";
import { PDFDocument } from "pdf-lib";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PdfSecurity() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"unlock" | "lock">("lock");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const reset = () => {
    setFile(null);
    setPassword("");
    setResultBlob(null);
    setError("");
  };

  const processPdf = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError("");

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      // ⚠️ AVISO IMPORTANTE:
      // pdf-lib NÃO cria criptografia real
      // isso apenas gera um PDF "regravado"
      const pdfBytes = await pdf.save();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf",
      });

      setResultBlob(blob);
    } catch (err) {
      console.error(err);
      setError("Não foi possível processar o PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              {mode === "unlock" ? (
                <Unlock className="w-6 h-6 text-violet-700" />
              ) : (
                <Lock className="w-6 h-6 text-violet-700" />
              )}
              Segurança de PDF
            </h3>

            {file && (
              <button
                onClick={reset}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
                Trocar
              </button>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setMode("unlock")}
              className={`px-4 py-2 rounded-xl font-semibold ${
                mode === "unlock" ? "bg-violet-600 text-white" : "bg-gray-100"
              }`}
            >
              🔓 Regravar PDF
            </button>

            <button
              onClick={() => setMode("lock")}
              className={`px-4 py-2 rounded-xl font-semibold ${
                mode === "lock" ? "bg-violet-600 text-white" : "bg-gray-100"
              }`}
            >
              🔒 Reorganizar PDF
            </button>
          </div>

          {!file && (
            <label className="block border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:border-violet-400">
              <Upload className="w-14 h-14 mx-auto text-violet-600 mb-4" />
              <p className="font-semibold text-gray-800">
                Clique para selecionar um PDF
              </p>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          )}

          {file && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
                ⚠️ Este recurso funciona totalmente no navegador. A proteção por
                senha **real** requer processamento em servidor.
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                  {error}
                </div>
              )}

              <button
                onClick={processPdf}
                disabled={isProcessing}
                className="w-full text-white py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95"
              >
                {isProcessing ? "Processando..." : "Processar PDF"}
              </button>

              {resultBlob && (
                <button
                  onClick={() => downloadBlob(resultBlob, "pdf_processado.pdf")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <Download className="w-5 h-5" />
                  Baixar PDF
                </button>
              )}

              <div className="text-sm text-gray-500 flex items-center gap-2 justify-center">
                <Info className="w-4 h-4 text-violet-600" />
                Processamento local no navegador
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
