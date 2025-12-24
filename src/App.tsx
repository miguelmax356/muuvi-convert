import { useState, lazy, Suspense } from "react";
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

const PDFConverter = lazy(() =>
  import("./components/PDFConverter").then((m) => ({ default: m.PDFConverter }))
);

function App() {
  const {
    user,
    isPremium,
    isLoading: authLoading,
    signOut,
    isAuthEnabled,
  } = useAuth();
  const [currentTool, setCurrentTool] = useState<"image" | "pdf">("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [compressedPreview, setCompressedPreview] = useState<string>("");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [targetSize, setTargetSize] = useState<250 | 350>(250);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-12">
          <div></div>
          <div className="flex items-center gap-4">
            {!isAuthEnabled ? (
              <div className="text-xs text-gray-500">
                Login/assinatura desativados (Supabase não configurado).
              </div>
            ) : user ? (
              <>
                {isPremium && (
                  <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-lg">
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
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuthModal(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Criar Conta
                </button>
              </>
            )}
          </div>
        </div>
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <ImageIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            muuvi <span className="text-blue-600">convert</span>
          </h1>
          <p className="text-lg text-gray-600">
            Sua ferramenta de conversão de PDF e Otimização de imagens online e
            gratuita
          </p>

          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={() => setCurrentTool("image")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentTool === "image"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              Compressor de Imagens
            </button>
            <button
              onClick={() => setCurrentTool("pdf")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentTool === "pdf"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FileText className="w-5 h-5" />
              Conversor PDF
            </button>
          </div>
        </div>

        {currentTool === "image" ? (
          !selectedFile ? (
            <div className="max-w-2xl mx-auto">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-105"
                    : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"
                }`}
              >
                <Upload className="w-16 h-16 mx-auto mb-6 text-blue-500" />
                <h3 className="text-2xl font-semibold text-gray-700 mb-3">
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
                  <span className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block">
                    Selecionar Arquivo
                  </span>
                </label>
                <p className="text-sm text-gray-400 mt-6">
                  Formatos suportados: JPG, PNG, WEBP
                </p>
              </div>

              <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Escolha o tamanho final:
                    </h4>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setTargetSize(250)}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                          targetSize === 250
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        250 KB
                      </button>
                      <button
                        onClick={() => setTargetSize(350)}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                          targetSize === 350
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        350 KB
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {!isPremium && user && (
                <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="w-6 h-6 text-amber-600" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          Ative o Premium
                        </p>
                        <p className="text-sm text-gray-600">
                          Remova anúncios e ganhe acesso ilimitado
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                    >
                      Saiba Mais
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Tamanho alvo: {targetSize} KB
                  </h3>
                  <button
                    onClick={reset}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Processar nova imagem
                  </button>
                </div>

                {isProcessing ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                    <p className="text-gray-600">Processando imagem...</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700">
                          Original
                        </h4>
                        <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                          {formatSize(originalSize)}
                        </span>
                      </div>
                      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={originalPreview}
                          alt="Original"
                          className="w-full h-64 object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700">
                          Comprimida
                        </h4>
                        <span className="text-sm bg-green-100 px-3 py-1 rounded-full text-green-700 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          {formatSize(compressedSize)}
                        </span>
                      </div>
                      <div className="border-2 border-green-200 rounded-lg overflow-hidden bg-gray-50">
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
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Redução de tamanho:
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {((1 - compressedSize / originalSize) * 100).toFixed(
                            1
                          )}
                          %
                        </p>
                      </div>
                      <button
                        onClick={handleDownload}
                        className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                        Baixar Imagem
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <Suspense
            fallback={
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                  <p className="text-gray-600">
                    Carregando conversor de PDF...
                  </p>
                </div>
              </div>
            }
          >
            <PDFConverter />
          </Suspense>
        )}

        <GoogleAdsense />

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Todas as imagens são processadas localmente no seu navegador.</p>
          <p>Suas imagens não são enviadas para nenhum servidor.</p>
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
    </div>
  );
}

export default App;
