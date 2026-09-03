import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { pmlApi } from '../services/pmlApi';

export interface UserProfileData {
  id?: string;
  user_id?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfileData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch or initialize user profile from Supabase
  const loadProfile = async (currentUser: User): Promise<UserProfileData | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        return data;
      }

      // If no profile record found, create one from user metadata
      const defaultFullName = 
        currentUser.user_metadata?.full_name || 
        (currentUser.email ? currentUser.email.split('@')[0] : 'Cosmic Explorer');

      const newProfile: UserProfileData = {
        id: currentUser.id,
        user_id: currentUser.id,
        full_name: defaultFullName,
        email: currentUser.email || '',
        updated_at: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert(newProfile);
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.warn('[PML Auth] Profile load/sync warning:', err);
      // Fallback profile object in memory
      const fallback: UserProfileData = {
        id: currentUser.id,
        user_id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'Cosmic Explorer'),
        email: currentUser.email || '',
      };
      setProfile(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    // 1. Initial Session Check (Restores user on page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      pmlApi.setAuthToken(session?.access_token || null);
      pmlApi.setUserId(session?.user?.id || null);

      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }).catch(err => {
      console.warn('[PML Auth] Error checking initial session:', err);
      setLoading(false);
    });

    // 2. Real-time Supabase Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      pmlApi.setAuthToken(newSession?.access_token || null);
      pmlApi.setUserId(newSession?.user?.id || null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          await loadProfile(newSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
        pmlApi.resetGuestSession();
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (!error && data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      pmlApi.setAuthToken(data.session.access_token);
      pmlApi.setUserId(data.user.id);
      await loadProfile(data.user);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const cleanName = fullName?.trim() || 'Cosmic Explorer';
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (!error && data.user) {
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        pmlApi.setAuthToken(data.session.access_token);
        pmlApi.setUserId(data.user.id);
      }
      // Upsert profile in Supabase database
      const initialProfile: UserProfileData = {
        id: data.user.id,
        user_id: data.user.id,
        full_name: cleanName,
        email: email.trim(),
        updated_at: new Date().toISOString(),
      };
      try {
        await supabase.from('profiles').upsert(initialProfile);
        setProfile(initialProfile);
      } catch (e) {
        console.warn('[PML Auth] Error creating profile on signup:', e);
      }
    }
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[PML Auth] Sign out error:', err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      pmlApi.resetGuestSession();
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
