import { useMemo, useState } from "react";
import { Upload, Download, Scissors, X, Info } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";

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

export function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string>("");

  const originalUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file]
  );
  const resultUrl = useMemo(
    () => (resultBlob ? URL.createObjectURL(resultBlob) : ""),
    [resultBlob]
  );

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setError("");
    setIsProcessing(false);
  };

  const process = async (f: File) => {
    setFile(f);
    setResultBlob(null);
    setError("");
    setIsProcessing(true);

    try {
      // removeBackground aceita Blob/File e retorna um PNG (Blob) com transparência
      const newBlob = await removeBackground(f); // :contentReference[oaicite:3]{index=3}
      setResultBlob(newBlob);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "Falha ao remover fundo. Tente outra imagem (de preferência JPG/PNG)."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const onPick = (picked?: File) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem (JPG/PNG/WEBP).");
      return;
    }
    process(picked);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Scissors className="w-6 h-6 text-violet-700" />
                Removedor de Fundo
              </h3>
              <p className="text-gray-600 mt-1">
                Escolha uma imagem e baixe o resultado em PNG com fundo
                transparente.
              </p>
            </div>

            {!!file && (
              <button
                onClick={reset}
                className="text-gray-700 hover:text-gray-900 font-medium flex items-center gap-2"
                title="Trocar imagem"
              >
                <X className="w-5 h-5" />
                Trocar
              </button>
            )}
          </div>

          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={[
                "border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
                isDragging
                  ? "border-violet-500 bg-violet-50/60 scale-[1.01]"
                  : "border-gray-300 bg-white hover:border-violet-400 hover:bg-violet-50/30",
              ].join(" ")}
            >
              <Upload className="w-16 h-16 mx-auto mb-6 text-violet-600" />
              <h4 className="text-2xl font-semibold text-gray-800 mb-2">
                Arraste sua imagem aqui
              </h4>
              <p className="text-gray-500 mb-6">ou</p>

              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files?.[0])}
                />
                <span className="cursor-pointer text-white px-8 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition inline-block">
                  Selecionar Arquivo
                </span>
              </label>

              <div className="mt-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                <Info className="w-4 h-4 text-violet-600" />
                Processamento local no navegador (sem upload).
              </div>
            </div>
          ) : (
            <>
              {isProcessing ? (
                <div className="text-center py-14">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4"></div>
                  <p className="text-gray-600">Removendo fundo...</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Na primeira vez pode demorar um pouco porque o navegador
                    carrega o modelo.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">Original</h4>
                      <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        {file.name}
                      </span>
                    </div>
                    <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                      <img
                        src={originalUrl}
                        alt="Original"
                        className="w-full h-72 object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">Sem fundo</h4>
                      <span className="text-xs bg-violet-100 px-3 py-1 rounded-full text-violet-700">
                        PNG transparente
                      </span>
                    </div>

                    <div className="border-2 border-violet-200 rounded-2xl overflow-hidden bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px]">
                      {resultUrl ? (
                        <img
                          src={resultUrl}
                          alt="Resultado"
                          className="w-full h-72 object-contain"
                        />
                      ) : (
                        <div className="h-72 flex items-center justify-center text-gray-500">
                          Nenhum resultado gerado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
                  {error}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => file && process(file)}
                  className="px-6 py-3 rounded-xl font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                  disabled={isProcessing}
                >
                  Processar novamente
                </button>

                <button
                  onClick={() => {
                    if (!resultBlob) return;
                    const base = (file?.name || "imagem").replace(
                      /\.[^/.]+$/,
                      ""
                    );
                    downloadBlob(resultBlob, `${base}_sem_fundo.png`);
                  }}
                  className="text-white px-8 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition flex items-center gap-2 disabled:opacity-60"
                  disabled={!resultBlob || isProcessing}
                >
                  <Download className="w-5 h-5" />
                  Baixar PNG
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
