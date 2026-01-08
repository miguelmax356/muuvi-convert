// src/pages/ShortRedirect.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function getCodeFromPath(pathname: string) {
  // /s/abc123 -> abc123
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "s") return parts[1].toLowerCase();
  return "";
}

export default function ShortRedirect() {
  const code = useMemo(() => getCodeFromPath(window.location.pathname), []);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!code) {
        setError("Código inválido.");
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase não configurado no ambiente.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("short-links", {
          body: { action: "resolve", code },
        });

        if (error) throw error;

        const url = data?.url as string | undefined;
        if (!url) {
          setError("Link não encontrado.");
          return;
        }

        window.location.replace(url);
      } catch (e: any) {
        setError(e?.message || "Erro ao resolver link.");
      }
    })();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 via-rose-50 to-violet-50">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {error ? "Não foi possível abrir" : "Redirecionando..."}
        </h1>
        <p className="text-sm text-gray-600">
          {error ? error : "Só um segundo 🙂"}
        </p>
      </div>
    </div>
  );
}
