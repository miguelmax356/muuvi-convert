import { useState, useMemo } from "react";
import { Copy, Type } from "lucide-react";

function sentenceCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
}

function toggleCase(text: string) {
  return text
    .split("")
    .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
    .join("");
}

function capitalizeWords(text: string) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function alternatingCase(text: string) {
  let upper = true;
  return text
    .split("")
    .map((c) => {
      if (!/[a-zA-Z]/.test(c)) return c;
      const r = upper ? c.toUpperCase() : c.toLowerCase();
      upper = !upper;
      return r;
    })
    .join("");
}

export function TextCaseConverter() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");

  // 🔢 CONTADORES
  const charCount = text.length;
  const charCountNoSpaces = useMemo(
    () => text.replace(/\s/g, "").length,
    [text]
  );

  const copy = () => {
    navigator.clipboard.writeText(result);
    alert("Texto copiado!");
  };

  const textActionBtn =
    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold " +
    "border border-gray-200 bg-white text-gray-800 " +
    "hover:bg-gradient-to-r hover:from-orange-500 hover:via-fuchsia-500 hover:to-violet-600 " +
    "hover:text-white hover:border-transparent " +
    "transition-all shadow-sm";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Type className="w-6 h-6 text-violet-600" />
            Conversor de Texto
          </h3>

          {/* TEXTO DE ENTRADA */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite ou cole seu texto aqui..."
            className="w-full h-40 border-2 border-gray-200 rounded-2xl p-4 focus:outline-none focus:border-violet-500"
          />

          {/* 🔢 CONTADOR DE CARACTERES */}
          <div className="flex justify-end gap-4 mt-2 text-sm text-gray-500">
            <span>
              <strong>{charCount}</strong> caracteres
            </span>
            <span>
              <strong>{charCountNoSpaces}</strong> sem espaços
            </span>
          </div>

          {/* BOTÕES */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => setResult(toggleCase(text))}
              className={textActionBtn}
            >
              🔄 Alternar Caixa
            </button>

            <button
              onClick={() => setResult(sentenceCase(text))}
              className={textActionBtn}
            >
              📝 Caso de Sentença
            </button>

            <button
              onClick={() => setResult(text.toLowerCase())}
              className={textActionBtn}
            >
              🔡 minúsculas
            </button>

            <button
              onClick={() => setResult(text.toUpperCase())}
              className={textActionBtn}
            >
              🔠 MAIÚSCULAS
            </button>

            <button
              onClick={() => setResult(capitalizeWords(text))}
              className={textActionBtn}
            >
              ✨ Capitalizar Palavras
            </button>

            <button
              onClick={() => setResult(alternatingCase(text))}
              className={textActionBtn}
            >
              🎭 Caso Alternativo
            </button>
          </div>

          {/* RESULTADO */}
          <div className="mt-6">
            <textarea
              value={result}
              readOnly
              placeholder="Resultado..."
              className="w-full h-40 border-2 border-violet-200 rounded-2xl p-4 bg-violet-50"
            />
          </div>

          <button
            onClick={copy}
            disabled={!result}
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 disabled:opacity-50"
          >
            <Copy className="w-5 h-5" />
            Copiar Texto
          </button>
        </div>
      </div>
    </div>
  );
}
