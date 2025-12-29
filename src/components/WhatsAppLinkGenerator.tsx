import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

type Country = {
  name: string;
  code: string;
  flag: string;
};

const countries: Country[] = [
  { name: "Brasil", code: "55", flag: "🇧🇷" },
  { name: "Estados Unidos", code: "1", flag: "🇺🇸" },
  { name: "Portugal", code: "351", flag: "🇵🇹" },
  { name: "Argentina", code: "54", flag: "🇦🇷" },
  { name: "México", code: "52", flag: "🇲🇽" },
];

export default function WhatsappLink() {
  const [country, setCountry] = useState<Country>(countries[0]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  function generateLink() {
    if (!phone) return;

    const cleanPhone = phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${country.code}${cleanPhone}?text=${encodedMessage}`;

    setLink(url);
  }

  function copyLink() {
    navigator.clipboard.writeText(link);
    alert("Link copiado!");
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-3xl p-[1px] bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 shadow-lg">
        <div className="bg-white rounded-3xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Gerador de Link do WhatsApp
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Crie links personalizados para conversar direto no WhatsApp
            </p>
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <select
              value={country.code}
              onChange={(e) =>
                setCountry(countries.find((c) => c.code === e.target.value)!)
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} (+{c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do WhatsApp
            </label>
            <div className="flex">
              <span className="flex items-center px-4 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-700 font-medium">
                {country.flag} +{country.code}
              </span>
              <input
                type="tel"
                placeholder="11999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-r-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem (opcional)
            </label>
            <textarea
              placeholder="Olá! Gostaria de mais informações 😊"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Botão */}
          <button
            onClick={generateLink}
            className="w-full py-3 rounded-xl font-semibold text-white shadow-lg bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:opacity-95 transition"
          >
            Gerar link do WhatsApp
          </button>

          {/* Resultado */}
          {link && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <input
                value={link}
                readOnly
                className="w-full text-sm px-4 py-2 rounded-xl border border-gray-300 bg-white"
              />

              <div className="flex gap-3">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>

                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
