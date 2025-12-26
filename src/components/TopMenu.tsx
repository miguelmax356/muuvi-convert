// src/components/TopMenu.tsx
import React from "react";
import { Image as ImageIcon, FileText, Sparkles } from "lucide-react";

type Tool = "image" | "pdf";

type Props = {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
};

export function TopMenu({ currentTool, setCurrentTool }: Props) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Barra com degradê */}
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 shadow-lg">
        <div className="rounded-2xl bg-white/80 backdrop-blur-md px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Marca */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>

              <div className="leading-tight">
                <p className="text-xs text-gray-500">Escolha uma ferramenta</p>
                <p className="text-lg font-extrabold text-gray-900">
                  muuvi{" "}
                  <span className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-700 bg-clip-text text-transparent">
                    convert
                  </span>
                </p>
              </div>
            </div>

            {/* Abas */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentTool("image")}
                className={[
                  "px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2",
                  "border",
                  currentTool === "image"
                    ? "bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 text-white border-transparent shadow-md"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <ImageIcon className="w-4 h-4" />
                Imagens
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool("pdf")}
                className={[
                  "px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2",
                  "border",
                  currentTool === "pdf"
                    ? "bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 text-white border-transparent shadow-md"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          {/* “Micro-status” embaixo */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <span>
              {currentTool === "image"
                ? "Comprimir e redimensionar imagens (250KB, 350KB, 500KB e 1MB)"
                : "Converter e comprimir PDFs mantendo a integridade sempre que possível"}
            </span>

            <span className="hidden sm:inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
