import { X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (plan: 'premium_monthly' | 'premium_yearly') => void;
  isLoading: boolean;
}

export function PricingModal({ isOpen, onClose, onCheckout, isLoading }: PricingModalProps) {
  const { isPremium } = useAuth();

  if (!isOpen) return null;

  const features = [
    'Sem limite de compressões',
    'Remover anúncios do Google',
    'Suporte prioritário',
    'Acesso total às funcionalidades',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Planos Premium</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isPremium && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
            Você já é um membro premium! Obrigado pelo suporte.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Mensal</h3>
            <p className="text-gray-600 mb-6">Renovação automática</p>
            <div className="text-4xl font-bold text-blue-600 mb-6">
              $4.99<span className="text-lg text-gray-600">/mês</span>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onCheckout('premium_monthly')}
              disabled={isLoading || isPremium}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isPremium ? 'Já Premium' : isLoading ? 'Processando...' : 'Assinar'}
            </button>
          </div>

          <div className="border-2 border-blue-600 rounded-lg p-6 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
              Economize 40%
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-2">Anual</h3>
            <p className="text-gray-600 mb-6">Renovação em 12 meses</p>
            <div className="text-4xl font-bold text-blue-600 mb-6">
              $35.88<span className="text-lg text-gray-600">/ano</span>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onCheckout('premium_yearly')}
              disabled={isLoading || isPremium}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isPremium ? 'Já Premium' : isLoading ? 'Processando...' : 'Assinar'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-8">
          Você pode cancelar sua assinatura a qualquer momento.
        </p>
      </div>
    </div>
  );
}
