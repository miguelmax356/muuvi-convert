// src/components/LinkShortener.tsx
import { useMemo, useState } from "react";
import {
  Link as LinkIcon,
  Copy,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const BASE_DOMAIN = "https://www.muuviconvert.com";

function normalizeUrl(input: string) {
  const t = input.trim();
  if (!/^https?:\/\//i.test(t)) return `https://${t}`;
  return t;
}

function isValidUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function LinkShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalized = useMemo(() => (url ? normalizeUrl(url) : ""), [url]);

  async function generateShortLink() {
    setError("");
    setShortUrl("");
    setCopied(false);

    if (!isSupabaseConfigured || !supabase) {
      setError(
        "Supabase não configurado no ambiente (VITE_SUPABASE_URL / ANON_KEY)."
      );
      return;
    }

    const target = normalizeUrl(url);
    if (!isValidUrl(target)) {
      setError("Link inválido. Use um URL completo (https://...)");
      return;
    }

    setIsWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("short-links", {
        body: { action: "create", url: target },
      });

      if (error) throw error;
      const code = data?.code as string | undefined;
      if (!code) throw new Error("Resposta inválida da function.");

      setShortUrl(`${BASE_DOMAIN}/s/${code}`);
    } catch (e: any) {
      setError(e?.message || "Erro ao encurtar link.");
    } finally {
      setIsWorking(false);
    }
  }

  async function copyLink() {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1300);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Encurtador de Link
              </h2>
              <p className="text-sm text-gray-500">
                Links no domínio muuviconvert.com
              </p>
            </div>
          </div>

          <input
            type="url"
            placeholder="Cole aqui o link completo (https://...)"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
              setShortUrl("");
              setCopied(false);
            }}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {error && (
            <div className="mb-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            onClick={generateShortLink}
            disabled={isWorking}
            className={`w-full mb-6 text-white px-6 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition ${
              isWorking ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isWorking ? "Encurtando..." : "Encurtar link"}
          </button>

          {shortUrl && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <p className="text-sm text-gray-500 mb-2">Link encurtado:</p>

              <div className="flex items-center gap-2">
                <input
                  value={shortUrl}
                  readOnly
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />

                <button
                  onClick={copyLink}
                  className="p-2 rounded-lg bg-violet-100 hover:bg-violet-200"
                  title="Copiar"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-700" />
                  ) : (
                    <Copy className="w-4 h-4 text-violet-700" />
                  )}
                </button>

                <a
                  href={normalized}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                  title="Abrir original"
                >
                  <ExternalLink className="w-4 h-4 text-gray-700" />
                </a>

                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-green-100 hover:bg-green-200"
                  title="Abrir encurtado"
                >
                  <ExternalLink className="w-4 h-4 text-green-700" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
