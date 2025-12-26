import React, { useMemo, useState } from "react";
import { Upload, Download, Image as ImageIcon, Info } from "lucide-react";

type PlatformKey =
  | "mercado_livre"
  | "shopee"
  | "amazon"
  | "instagram_feed"
  | "instagram_story"
  | "whatsapp_status"
  | "linkedin"
  | "google_meu_negocio";

type Preset = {
  key: PlatformKey;
  label: string;
  width: number;
  height: number;
  note?: string;
};

const PRESETS: Preset[] = [
  {
    key: "mercado_livre",
    label: "Mercado Livre",
    width: 1200,
    height: 1200,
    note: "Quadrada (ideal para anúncio/produto)",
  },
  {
    key: "shopee",
    label: "Shopee",
    width: 1080,
    height: 1080,
    note: "Quadrada (produto)",
  },
  {
    key: "amazon",
    label: "Amazon",
    width: 1600,
    height: 1600,
    note: "Quadrada (produto)",
  },

  {
    key: "instagram_feed",
    label: "Instagram Feed (4:5)",
    width: 1080,
    height: 1350,
    note: "Mais alcance no feed",
  },
  {
    key: "instagram_story",
    label: "Instagram Story (9:16)",
    width: 1080,
    height: 1920,
    note: "Stories/Reels",
  },

  {
    key: "whatsapp_status",
    label: "WhatsApp Status (9:16)",
    width: 1080,
    height: 1920,
    note: "Status",
  },

  {
    key: "linkedin",
    label: "LinkedIn Post (1.91:1)",
    width: 1200,
    height: 628,
    note: "Post horizontal",
  },

  {
    key: "google_meu_negocio",
    label: "Google Meu Negócio (4:3)",
    width: 1200,
    height: 900,
    note: "Foto para perfil/listagem",
  },
];

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.onload = () => resolve(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * "Contain" (encaixar) dentro do tamanho alvo, sem cortar.
 * Preenche o fundo de branco pra não ficar transparente quando exportar JPG.
 */
async function resizeToPreset(file: File, width: number, height: number) {
  const img = await loadImageFromFile(file);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao criar canvas");

  // fundo branco
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // escala "contain"
  const scale = Math.min(width / img.width, height / img.height);
  const drawW = Math.round(img.width * scale);
  const drawH = Math.round(img.height * scale);

  const dx = Math.round((width - drawW) / 2);
  const dy = Math.round((height - drawH) / 2);

  ctx.drawImage(img, dx, dy, drawW, drawH);

  // exporta JPG (bom para marketplace) — você pode trocar pra PNG se quiser
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.92
    );
  });

  return blob;
}

export function ImagePlatformResizer() {
  const [presetKey, setPresetKey] = useState<PlatformKey>("instagram_feed");

  const preset = useMemo(
    () => PRESETS.find((p) => p.key === presetKey) || PRESETS[0],
    [presetKey]
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl("");
    setErrorMsg("");
  };

  const process = async (file: File, p = preset) => {
    setErrorMsg("");
    setSelectedFile(file);
    setIsProcessing(true);

    // preview original
    const originalPreview = URL.createObjectURL(file);
    setPreviewUrl(originalPreview);

    try {
      const blob = await resizeToPreset(file, p.width, p.height);

      setOutputBlob(blob);

      if (outputUrl) URL.revokeObjectURL(outputUrl);
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Erro ao redimensionar");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quando trocar o preset e já tiver arquivo, reprocessa automaticamente
  React.useEffect(() => {
    if (selectedFile) process(selectedFile, preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Selecione um arquivo de imagem (JPG/PNG/WEBP).");
      return;
    }
    process(file, preset);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Arraste uma imagem (JPG/PNG/WEBP).");
      return;
    }
    process(file, preset);
  };

  const handleDownload = () => {
    if (!outputBlob) return;

    const a = document.createElement("a");
    const url = URL.createObjectURL(outputBlob);
    a.href = url;

    const baseName = selectedFile?.name?.replace(/\.[^.]+$/, "") || "imagem";
    a.download = `${baseName}_${preset.label.replace(/\s+/g, "_")}_${
      preset.width
    }x${preset.height}.jpg`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Redimensionar imagem por plataforma
              </h3>
              <p className="text-gray-600 mt-1">
                Saída:{" "}
                <span className="font-semibold">
                  {preset.width} × {preset.height}
                </span>{" "}
                {preset.note ? (
                  <span className="text-gray-500">— {preset.note}</span>
                ) : null}
              </p>
            </div>

            {selectedFile ? (
              <button
                onClick={reset}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Processar outra imagem
              </button>
            ) : null}
          </div>

          {/* Presets */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-violet-600 flex-shrink-0 mt-1" />
              <div className="w-full">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Escolha a plataforma:
                </h4>

                <div className="flex flex-wrap gap-3">
                  {PRESETS.map((p) => {
                    const active = p.key === presetKey;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setPresetKey(p.key)}
                        className={[
                          "px-4 py-2 rounded-xl font-semibold transition-all border text-sm",
                          active
                            ? "text-white border-transparent shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Dica: aqui a gente “encaixa” a imagem sem cortar e centraliza
                  com fundo branco.
                </p>
              </div>
            </div>
          </div>

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={[
                "border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
                isDragging
                  ? "border-violet-500 bg-violet-50/60 scale-[1.01]"
                  : "border-gray-300 bg-white hover:border-violet-400 hover:bg-violet-50/30",
              ].join(" ")}
            >
              <ImageIcon className="w-16 h-16 mx-auto mb-6 text-violet-600" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                Arraste sua imagem aqui
              </h3>
              <p className="text-gray-500 mb-6">ou</p>

              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="cursor-pointer text-white px-8 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition inline-block">
                  Selecionar Arquivo
                </span>
              </label>

              <p className="text-sm text-gray-400 mt-6">
                Formatos suportados: JPG, PNG, WEBP
              </p>
            </div>
          ) : (
            <>
              {errorMsg ? (
                <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
                  {errorMsg}
                </div>
              ) : null}

              {isProcessing ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4"></div>
                  <p className="text-gray-600">Redimensionando...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Original</h4>
                    <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                      <img
                        src={previewUrl}
                        alt="Original"
                        className="w-full h-64 object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      Saída ({preset.width}×{preset.height})
                    </h4>
                    <div className="border-2 border-green-200 rounded-2xl overflow-hidden bg-gray-50">
                      <img
                        src={outputUrl}
                        alt="Saída"
                        className="w-full h-64 object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isProcessing && outputBlob ? (
                <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-end">
                  <button
                    onClick={handleDownload}
                    className="text-white px-8 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Baixar imagem
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
