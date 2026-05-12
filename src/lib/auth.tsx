import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from './supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('id, nome, email, role, ativo')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        // RLS esconde perfis inativos: data vira null → desloga.
        if (!data) {
          await supabase.auth.signOut();
          setProfile(null);
          return;
        }
        setProfile(data as Profile);
      });
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

export function PrivateRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: UserRole;
}) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p style={{ padding: 40 }}>Carregando...</p>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
}
