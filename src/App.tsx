// src/App.tsx
import { useEffect, useState, lazy, Suspense } from "react";
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
} from "lucide-react";
import { compressImage } from "./utils/imageCompressor";
import { useAuth } from "./context/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { PricingModal } from "./components/PricingModal";
import { GoogleAdsense } from "./components/GoogleAdsense";
import { Footer } from "./components/Footer";

const PDFConverter = lazy(() =>
  import("./components/PDFConverter").then((m) => ({ default: m.PDFConverter }))
);

type Tool = "image" | "pdf";
type TargetSize = 250 | 350 | 500 | 1024;

function App() {
  const {
    user,
    isPremium,
    isLoading: authLoading,
    signOut,
    isAuthEnabled,
  } = useAuth();

  const [currentTool, setCurrentTool] = useState<Tool>("image");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [compressedPreview, setCompressedPreview] = useState<string>("");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const [targetSize, setTargetSize] = useState<TargetSize>(250);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    if (bytes < k) return bytes + " Bytes";
    if (bytes < k * k) return (bytes / k).toFixed(2) + " KB";
    return (bytes / (k * k)).toFixed(2) + " MB";
  };

  const reset = () => {
    setSelectedFile(null);
    setOriginalPreview("");
    setCompressedPreview("");
    setOriginalSize(0);
    setCompressedSize(0);
    setCompressedBlob(null);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setOriginalSize(file.size);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      setOriginalPreview(preview);

      try {
        const compressed = await compressImage(file, targetSize);
        setCompressedBlob(compressed);
        setCompressedSize(compressed.size);

        const compressedUrl = URL.createObjectURL(compressed);
        setCompressedPreview(compressedUrl);
      } catch (error) {
        console.error("Compression error:", error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Se o usuário trocar o tamanho alvo com imagem já selecionada, recomprime automaticamente
  useEffect(() => {
    if (selectedFile) processFile(selectedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSize]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
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

  const handleCheckout = async (plan: "premium_monthly" | "premium_yearly") => {
    if (!user) {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            plan,
          }),
        }
      );

      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const ToolButton = ({
    active,
    icon,
    children,
    onClick,
  }: {
    active: boolean;
    icon: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
        active
          ? "text-white shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600"
          : "bg-white/80 text-gray-700 hover:bg-white border border-gray-200",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );

  const SizeButton = ({
    value,
    label,
  }: {
    value: TargetSize;
    label: string;
  }) => {
    const active = targetSize === value;
    return (
      <button
        onClick={() => setTargetSize(value)}
        className={[
          "px-5 py-3 rounded-xl font-semibold transition-all border",
          active
            ? "text-white border-transparent shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600"
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

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
          </div>
        </div>

        {/* Conteúdo */}
        {currentTool === "image" ? (
          !selectedFile ? (
            <div className="max-w-2xl mx-auto">
              {/* Container no mesmo estilo do PDF/Menu */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
                <div className="bg-white rounded-3xl p-8">
                  {/* Dropzone */}
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

                  {/* Tamanhos */}
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
                          Dica: 1MB é ótimo para marketplaces que aceitam
                          imagens maiores, mantendo qualidade.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Premium CTA */}
                  {!isPremium && user && (
                    <div className="mt-7 rounded-2xl p-[1px] bg-gradient-to-r from-amber-400 via-orange-400 to-fuchsia-500">
                      <div className="bg-white rounded-2xl p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Crown className="w-6 h-6 text-amber-600" />
                            <div>
                              <p className="font-semibold text-gray-900">
                                Ative o Premium
                              </p>
                              <p className="text-sm text-gray-600">
                                Remova anúncios e ganhe acesso ilimitado.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowPricingModal(true)}
                            className="text-white px-6 py-2 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition"
                          >
                            Saiba Mais
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
                <div className="bg-white rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Compressor de Imagens
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Tamanho alvo:{" "}
                        <span className="font-semibold">
                          {targetSize === 1024 ? "1 MB" : `${targetSize} KB`}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={reset}
                      className="text-gray-700 hover:text-gray-900 font-medium"
                    >
                      Processar nova imagem
                    </button>
                  </div>

                  {/* Progresso */}
                  {isProcessing ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4"></div>
                      <p className="text-gray-600">Processando imagem...</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800">
                            Original
                          </h4>
                          <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                            {formatSize(originalSize)}
                          </span>
                        </div>
                        <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                          <img
                            src={originalPreview}
                            alt="Original"
                            className="w-full h-64 object-contain"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800">
                            Comprimida
                          </h4>
                          <span className="text-sm bg-green-100 px-3 py-1 rounded-full text-green-700 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {formatSize(compressedSize)}
                          </span>
                        </div>
                        <div className="border-2 border-green-200 rounded-2xl overflow-hidden bg-gray-50">
                          <img
                            src={compressedPreview}
                            alt="Compressed"
                            className="w-full h-64 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isProcessing && compressedBlob && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            Redução de tamanho:
                          </p>
                          <p className="text-2xl font-extrabold text-gray-900">
                            {(
                              (1 - compressedSize / originalSize) *
                              100
                            ).toFixed(1)}
                            <span className="text-green-600">%</span>
                          </p>
                        </div>

                        <button
                          onClick={handleDownload}
                          className="text-white px-8 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition flex items-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Baixar Imagem
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Troca rápida de tamanho */}
              <div className="mt-5 flex flex-wrap gap-3 justify-center">
                <SizeButton value={250} label="250 KB" />
                <SizeButton value={350} label="350 KB" />
                <SizeButton value={500} label="500 KB" />
                <SizeButton value={1024} label="1 MB" />
              </div>
            </div>
          )
        ) : (
          <Suspense
            fallback={
              <div className="max-w-2xl mx-auto">
                <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
                  <div className="bg-white rounded-3xl p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-violet-600 mb-4"></div>
                    <p className="text-gray-600">
                      Carregando conversor de PDF...
                    </p>
                  </div>
                </div>
              </div>
            }
          >
            <PDFConverter />
          </Suspense>
        )}

        <GoogleAdsense />

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Tudo é processado localmente no seu navegador.</p>
          <p>Nenhum arquivo é enviado para servidor.</p>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        isLoading={isCheckoutLoading}
      />

      <Footer />
    </div>
  );
}

export default App;
