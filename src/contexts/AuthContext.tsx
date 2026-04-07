import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const safetyTimer = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn("[Auth] Session bootstrap timeout; releasing loading state");
      setLoading(false);
    }, 5000);

    console.info("[Auth] Bootstrapping auth", {
      href: window.location.href,
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      console.info("[Auth] Auth state changed", {
        event,
        hasSession: !!nextSession,
        userId: nextSession?.user?.id ?? null,
      });

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!isMounted) return;

        console.info("[Auth] Initial session resolved", {
          hasSession: !!data.session,
          userId: data.session?.user?.id ?? null,
        });

        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((error) => {
        console.error("[Auth] Initial session failed", error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        window.clearTimeout(safetyTimer);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
