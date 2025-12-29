// src/App.tsx
import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  Upload,
  Image as ImageIcon,
  Download,
  Check,
  Info,
  User,
  LogOut,
  Crown,
  FileText,
  Scissors,
  Lock,
  Type,
  Video,
  Mic,
  MessageCircle,
  Link,
} from "lucide-react";

import { compressImage } from "./utils/imageCompressor";
import { BackgroundRemover } from "./components/BackgroundRemover";
import { ImagePlatformResizer } from "./components/ImagePlatformResizer";
import { PdfSecurity } from "./components/PdfSecurity";
import { TextCaseConverter } from "./components/TextCaseConverter";
import { VideoCompressor } from "./components/VideoCompressor";
import AudioTranscriber from "./components/AudioTranscriber";
import WhatsappLink from "./components/WhatsAppLinkGenerator";
import LinkShortener from "./components/LinkShortener";

import { useAuth } from "./context/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { PricingModal } from "./components/PricingModal";
import { GoogleAdsense } from "./components/GoogleAdsense";
import { Footer } from "./components/Footer";

const PDFConverter = lazy(() =>
  import("./components/PDFConverter").then((m) => ({ default: m.PDFConverter }))
);

type Tool =
  | "image"
  | "pdf"
  | "bg"
  | "resize"
  | "pdf-security"
  | "text"
  | "video"
  | "audio"
  | "whatsapp"
  | "shortlink";

type TargetSize = 250 | 350 | 500 | 1024;

function App() {
  /* =========================================================================
   * AUTH / PREMIUM
   * ========================================================================= */
  const {
    user,
    isPremium,
    isLoading: authLoading,
    signOut,
    isAuthEnabled,
  } = useAuth();

  /* =========================================================================
   * UI STATE
   * ========================================================================= */
  const [currentTool, setCurrentTool] = useState<Tool>("image");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  /* =========================================================================
   * IMAGE COMPRESSOR STATE
   * ========================================================================= */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [compressedPreview, setCompressedPreview] = useState<string>("");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetSize, setTargetSize] = useState<TargetSize>(250);

  /* =========================================================================
   * HELPERS
   * ========================================================================= */
  const formatSize = (bytes: number) => {
    if (!bytes || Number.isNaN(bytes)) return "0 KB";
    const kb = bytes / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
  };

  const compressionSavings = useMemo(() => {
    if (!originalSize || !compressedSize) return 0;
    return Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100)
    );
  }, [originalSize, compressedSize]);

  const resetCompressor = () => {
    setSelectedFile(null);
    setOriginalPreview("");
    setCompressedPreview("");
    setOriginalSize(0);
    setCompressedSize(0);
    setCompressedBlob(null);
    setIsDragging(false);
    setIsProcessing(false);
  };

  const isBrowserSupported = () => {
    return (
      typeof window !== "undefined" &&
      ("MediaRecorder" in window || "webkitSpeechRecognition" in window)
    );
  };

  /* =========================================================================
   * IMAGE COMPRESSOR LOGIC
   * ========================================================================= */
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);

    // preview original
    const originalUrl = URL.createObjectURL(file);
    setOriginalPreview(originalUrl);
    setOriginalSize(file.size);

    try {
      const blob = await compressImage(file, targetSize);
      setCompressedBlob(blob);
      setCompressedSize(blob.size);

      const compressedUrl = URL.createObjectURL(blob);
      setCompressedPreview(compressedUrl);
    } catch (err) {
      console.error("compressImage error:", err);
      setCompressedBlob(null);
      setCompressedPreview("");
      setCompressedSize(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDownload = () => {
    if (!compressedBlob || !selectedFile) return;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compressed_${selectedFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* =========================================================================
   * CHECKOUT (mantive seu “gancho” sem alterar o layout)
   * ========================================================================= */
  const handleCheckout = async (
    _plan: "premium_monthly" | "premium_yearly"
  ) => {
    if (!user) {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    try {
      setIsCheckoutLoading(true);
      // sua lógica de checkout aqui (se já existir)
    } catch (e) {
      console.error("checkout error:", e);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  /* =========================================================================
   * CLEANUP URLS
   * ========================================================================= */
  useEffect(() => {
    return () => {
      if (originalPreview) URL.revokeObjectURL(originalPreview);
      if (compressedPreview) URL.revokeObjectURL(compressedPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================================
   * UI COMPONENTS (sem hooks aqui dentro)
   * ========================================================================= */
  const ToolButton = ({
    active,
    onClick,
    icon,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={[
        // Base
        "flex items-center justify-center gap-2 rounded-xl font-medium transition shadow-sm",

        // MOBILE (até md)
        "px-3 py-2 text-xs w-[48%] sm:w-[32%]",

        // DESKTOP (md+)
        "md:w-auto md:px-5 md:py-3 md:text-sm md:rounded-2xl md:font-semibold",

        active
          ? "bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 text-white"
          : "bg-white border border-gray-200 text-gray-800 hover:bg-gray-50",
      ].join(" ")}
    >
      <span
        className={[
          "flex-shrink-0",
          "w-4 h-4 md:w-5 md:h-5",
          active ? "text-white" : "text-gray-700",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="whitespace-nowrap">{children}</span>
    </button>
  );

  const SizeButton = ({
    value,
    label,
  }: {
    value: TargetSize;
    label: string;
  }) => (
    <button
      onClick={() => setTargetSize(value)}
      className={[
        "px-4 py-2 rounded-xl text-sm font-semibold transition border",
        targetSize === value
          ? "bg-violet-600 text-white border-violet-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );

  /* =========================================================================
   * RENDER TOOL CONTENT
   * ========================================================================= */
  const renderToolContent = () => {
    if (currentTool === "bg") return <BackgroundRemover />;

    if (currentTool === "pdf-security") {
      return <PdfSecurity />;
    }

    if (currentTool === "resize") return <ImagePlatformResizer />;

    if (currentTool === "text") return <TextCaseConverter />;

    if (currentTool === "video") return <VideoCompressor />;

    if (currentTool === "whatsapp") return <WhatsappLink />;

    if (currentTool === "shortlink") return <LinkShortener />;

    if (currentTool === "audio") {
      if (!isBrowserSupported()) {
        return (
          <div className="max-w-xl mx-auto mt-10">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <Mic className="w-10 h-10 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                Navegador não suportado
              </h3>
              <p className="text-sm text-amber-700">
                A transcrição de áudio funciona melhor no
                <strong> Google Chrome </strong>
                ou navegadores baseados em Chromium.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Seu navegador atual não suporta as APIs necessárias.
              </p>
            </div>
          </div>
        );
      }

      return <AudioTranscriber />;
    }

    if (currentTool === "pdf") {
      return (
        <div className="max-w-6xl mx-auto">
          <Suspense
            fallback={
              <div className="text-center py-14">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4" />
                <p className="text-gray-600">Carregando conversor...</p>
              </div>
            }
          >
            <PDFConverter />
          </Suspense>
        </div>
      );
    }

    // default: compressor
    return !selectedFile ? (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
          <div className="bg-white rounded-3xl p-8">
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
              <Upload className="w-16 h-16 mx-auto mb-6 text-violet-600" />
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

            <div className="mt-7 bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-violet-600 flex-shrink-0 mt-1" />
                <div className="w-full">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Escolha o tamanho final:
                  </h4>

                  <div className="flex flex-wrap gap-3">
                    <SizeButton value={250} label="250 KB" />
                    <SizeButton value={350} label="350 KB" />
                    <SizeButton value={500} label="500 KB" />
                    <SizeButton value={1024} label="1 MB" />
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Dica: 1MB é ótimo para marketplaces que aceitam imagens
                    maiores, mantendo qualidade.
                  </p>
                </div>
              </div>
            </div>

            <GoogleAdsense />
          </div>
        </div>
      </div>
    ) : (
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
          <div className="bg-white rounded-3xl p-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Resultado da compressão
                </h3>
                <p className="text-gray-600">
                  Economizou{" "}
                  <span className="font-semibold">{compressionSavings}%</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  disabled={!compressedBlob}
                  className={[
                    "inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition",
                    compressedBlob
                      ? "bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 text-white hover:opacity-95"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  <Download className="w-5 h-5" />
                  Baixar
                </button>

                <button
                  onClick={resetCompressor}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Processar nova imagem
                </button>
              </div>
            </div>

            {isProcessing ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4" />
                <p className="text-gray-600">Processando imagem...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Original</h4>
                    <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                      {formatSize(originalSize)}
                    </span>
                  </div>
                  <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                    <img
                      src={originalPreview}
                      alt="Original"
                      className="w-full h-80 object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Comprimida</h4>
                    <span className="text-sm bg-violet-100 px-3 py-1 rounded-full text-violet-700">
                      {formatSize(compressedSize)}
                    </span>
                  </div>
                  <div className="border-2 border-violet-200 rounded-2xl overflow-hidden bg-violet-50">
                    {compressedPreview ? (
                      <img
                        src={compressedPreview}
                        alt="Comprimida"
                        className="w-full h-80 object-contain"
                      />
                    ) : (
                      <div className="h-80 flex items-center justify-center text-gray-500">
                        Não foi possível gerar a versão comprimida.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
              <Check className="w-5 h-5 text-green-600" />
              Qualidade preservada com compressão inteligente (navegador).
            </div>

            <GoogleAdsense />
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * RENDER (mantendo o layout do seu “muuvi convert”)
   * ========================================================================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-violet-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 leading-none">muuvi</p>
              <p className="text-lg font-bold text-gray-900 leading-none">
                convert
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isAuthEnabled ? (
              <div className="text-xs text-gray-500">
                Login/assinatura desativados (Supabase não configurado).
              </div>
            ) : user ? (
              <>
                {isPremium && (
                  <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">Premium</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">{user.email}</span>
                </div>

                <button
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthModal(true);
                  }}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Entrar
                </button>

                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuthModal(true);
                  }}
                  className="text-white px-4 py-2 rounded-xl font-medium shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition"
                >
                  Criar Conta
                </button>
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-3">
            muuvi{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600">
              convert
            </span>
          </h1>

          <p className="text-lg text-gray-600">
            Conversão de PDF + Otimização de imagens online, gratuita e rápida.
          </p>

          {/* Menu de ferramentas */}
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <ToolButton
              active={currentTool === "bg"}
              onClick={() => setCurrentTool("bg")}
              icon={<Scissors className="w-5 h-5" />}
            >
              Removedor de Fundo
            </ToolButton>

            <ToolButton
              active={currentTool === "resize"}
              onClick={() => setCurrentTool("resize")}
              icon={<ImageIcon className="w-5 h-5" />}
            >
              Redimensionar por plataforma
            </ToolButton>

            <ToolButton
              active={currentTool === "image"}
              onClick={() => setCurrentTool("image")}
              icon={<ImageIcon className="w-5 h-5" />}
            >
              Compressor de Imagens
            </ToolButton>

            <ToolButton
              active={currentTool === "pdf"}
              onClick={() => setCurrentTool("pdf")}
              icon={<FileText className="w-5 h-5" />}
            >
              Conversor PDF
            </ToolButton>

            <ToolButton
              active={currentTool === "pdf-security"}
              onClick={() => setCurrentTool("pdf-security")}
              icon={<Lock className="w-5 h-5" />}
            >
              Segurança PDF
            </ToolButton>

            <ToolButton
              active={currentTool === "text"}
              onClick={() => setCurrentTool("text")}
              icon={<Type className="w-5 h-5" />}
            >
              Conversor de Texto
            </ToolButton>

            <ToolButton
              active={currentTool === "video"}
              onClick={() => setCurrentTool("video")}
              icon={<Video className="w-5 h-5" />}
            >
              Vídeo Curto
            </ToolButton>

            <ToolButton
              active={currentTool === "audio"}
              onClick={() => setCurrentTool("audio")}
              icon={<Mic className="w-5 h-5" />}
            >
              Transcrição de Áudio
            </ToolButton>

            <ToolButton
              active={currentTool === "whatsapp"}
              onClick={() => setCurrentTool("whatsapp")}
              icon={<MessageCircle className="w-5 h-5" />}
            >
              Links de WhatsApp
            </ToolButton>

            <ToolButton
              active={currentTool === "shortlink"}
              onClick={() => setCurrentTool("shortlink")}
              icon={<Link className="w-5 h-5" />}
            >
              Encurtador de Link
            </ToolButton>
          </div>
        </div>

        {/* Conteúdo */}
        {authLoading ? (
          <div className="text-center py-14">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4"></div>
            <p className="text-gray-600">Carregando…</p>
          </div>
        ) : (
          renderToolContent()
        )}

        {/* Modais */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onChangeMode={setAuthMode}
        />

        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onCheckout={handleCheckout}
          isLoading={isCheckoutLoading}
        />

        <Footer />
      </div>
    </div>
  );
}

export default App;
