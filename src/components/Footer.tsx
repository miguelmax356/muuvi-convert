import { ShieldCheck, Image, Link, Info, ChefHat, BotIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Marca */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              muuvi <span className="text-blue-600">convert</span>
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ferramenta online para conversão de PDF e otimização de imagens.
              Rápido, gratuito e seguro.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Nossos Produtos
            </h4>

            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a
                  href="/"
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <Image className="w-4 h-4 text-blue-500" />
                  Conversor de PDF e Imagens
                </a>
              </li>

              <li>
                <a
                  href="https://wa.me/5571985063595?text=Olá!%20Cheguei%20pelo%20site%20e%20tenho%20interesse%20em%20um%20Chatbot%20Premium%20com%20IA,%20automações%20e%20integrações%20para%20escalar%20meu%20atendimento.%20Podemos%20conversar?
"
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <BotIcon className="w-4 h-4 text-blue-500" />
                  Chatbot para Whatsapp
                </a>
              </li>
              <li>
                <a
                  href="https://www.muuvi.com.br/"
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <ChefHat className="w-4 h-4 text-blue-500" />
                  Gestor de Pedidos e Cardápio digital
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5571985063595?text=Olá!%20Vim%20através%20do%20site%20e%20tenho%20interesse%20na%20criação%20de%20um%20site.%20Podemos%20conversar?
"
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <Link className="w-4 h-4 text-blue-500" />
                  Criação de Sites
                </a>
              </li>
              <li></li>
            </ul>
          </div>

          {/* Confiança */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Segurança
            </h4>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                Todos os arquivos são processados localmente no seu navegador.
                Nenhum arquivo é enviado para servidores externos.
              </p>
            </div>
          </div>
        </div>

        {/* Linha inferior */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} Grupo Muuvi. Todos os direitos
            reservados.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="/termos.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              Termos de Uso
            </a>

            <a
              href="/privacidade.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
