import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

/**
 * AuthContext
 * - Se o Supabase NÃO estiver configurado (env vars ausentes), o app NÃO quebra.
 * - O contexto continua existindo, mas com autenticação/assinatura desativadas.
 */

interface Subscription {
  id: string;
  user_id: string;
  status: "active" | "canceled" | "expired";
  plan: "free" | "premium_monthly" | "premium_yearly";
  stripe_customer_id: string | null;
  current_period_end: string | null;
}

interface AuthContextType {
  // flags
  isAuthEnabled: boolean;
  isLoading: boolean;

  // estado
  user: User | null;
  subscription: Subscription | null;

  // derived
  isPremium: boolean;

  // ações
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthEnabled = isSupabaseConfigured;

  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Se auth estiver desativado, nunca tenta chamar supabase.*
  useEffect(() => {
    if (!isAuthEnabled || !supabase) {
      setUser(null);
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    // 1) Pega sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    // 2) Escuta mudanças
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      // Aqui você pode buscar dados reais de assinatura na sua tabela do Supabase.
      // Como fallback, mantém "free/active" quando o usuário estiver logado.
      if (session?.user) {
        setSubscription({
          id: "",
          user_id: session.user.id,
          plan: "free",
          status: "active",
          stripe_customer_id: null,
          current_period_end: null,
        });
      } else {
        setSubscription(null);
      }

      setIsLoading(false);
    });

    return () => {
      authSubscription?.unsubscribe();
    };
  }, [isAuthEnabled]);

  const isPremium = useMemo(() => {
    if (!subscription) return false;
    return subscription.plan !== "free" && subscription.status === "active";
  }, [subscription]);

  const signUp = async (email: string, password: string) => {
    if (!isAuthEnabled || !supabase) throw new Error("Auth desativado: Supabase não configurado.");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    if (!isAuthEnabled || !supabase) throw new Error("Auth desativado: Supabase não configurado.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!isAuthEnabled || !supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthEnabled,
        isLoading,
        user,
        subscription,
        isPremium,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
