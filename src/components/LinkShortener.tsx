import { useState } from "react";
import { Link, Copy, ExternalLink } from "lucide-react";

export default function LinkShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");

  function generateShortLink() {
    if (!url) return;

    const randomCode = Math.random().toString(36).substring(2, 8);
    const short = `https://muuvi.link/${randomCode}`;

    setShortUrl(short);
  }

  function copyLink() {
    navigator.clipboard.writeText(shortUrl);
    alert("Link copiado!");
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 shadow-lg">
        <div className="bg-white rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Link className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Encurtador de Link
            </h2>
          </div>

          <input
            type="url"
            placeholder="Cole aqui o link completo (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <button
            onClick={generateShortLink}
            className="w-full mb-6 text-white px-6 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 hover:opacity-95 transition"
          >
            Encurtar link
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
                  <Copy className="w-4 h-4 text-violet-700" />
                </button>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                  title="Abrir original"
                >
                  <ExternalLink className="w-4 h-4 text-gray-700" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
