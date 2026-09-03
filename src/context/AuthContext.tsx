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
    // 1. Initial Local Session Check (Restores user from persistent local storage)
    const savedLocal = localStorage.getItem('pml_local_auth_session');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed?.access_token && parsed?.user) {
          setSession(parsed);
          setUser(parsed.user);
          pmlApi.setAuthToken(parsed.access_token);
          pmlApi.setUserId(parsed.user.id);
          setProfile({
            id: parsed.user.id,
            user_id: parsed.user.id,
            full_name: parsed.user.user_metadata?.full_name || parsed.user.email?.split('@')[0] || 'Cosmic Explorer',
            email: parsed.user.email || '',
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('pml_local_auth_session');
      }
    }

    // 2. Supabase Initial Session Check
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

    // 3. Real-time Supabase Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Ignore if currently using local auth session
      if (localStorage.getItem('pml_local_auth_session')) return;

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
    // 1. Try PML backend local auth endpoint first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (res.ok) {
        const data = await res.json();
        const userObj: any = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: { full_name: data.user.full_name },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        };
        const sessionObj: any = {
          access_token: data.session.access_token,
          token_type: 'bearer',
          user: userObj
        };

        localStorage.setItem('pml_local_auth_session', JSON.stringify(sessionObj));
        setSession(sessionObj);
        setUser(userObj);
        pmlApi.setAuthToken(sessionObj.access_token);
        pmlApi.setUserId(userObj.id);

        const newProfile: UserProfileData = {
          id: userObj.id,
          user_id: userObj.id,
          full_name: data.user.full_name || 'Cosmic Explorer',
          email: email.trim(),
          avatar_url: data.user.avatar_url,
          updated_at: new Date().toISOString()
        };
        setProfile(newProfile);

        return { error: null };
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.detail) {
          return { error: { message: errData.detail } as any };
        }
      }
    } catch (err) {
      console.warn('[PML Auth] Local login network error, trying Supabase fallback:', err);
    }

    // 2. Fallback to Supabase
    try {
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
    } catch (e: any) {
      return { error: { message: e.message || 'Unable to connect to authentication server.' } as any };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const cleanName = fullName?.trim() || 'Cosmic Explorer';

    // 1. Try PML backend local auth endpoint first
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, full_name: cleanName })
      });

      if (res.ok) {
        const data = await res.json();
        const userObj: any = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: { full_name: data.user.full_name },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        };
        const sessionObj: any = {
          access_token: data.session.access_token,
          token_type: 'bearer',
          user: userObj
        };

        localStorage.setItem('pml_local_auth_session', JSON.stringify(sessionObj));
        setSession(sessionObj);
        setUser(userObj);
        pmlApi.setAuthToken(sessionObj.access_token);
        pmlApi.setUserId(userObj.id);

        const initialProfile: UserProfileData = {
          id: userObj.id,
          user_id: userObj.id,
          full_name: cleanName,
          email: email.trim(),
          updated_at: new Date().toISOString(),
        };
        setProfile(initialProfile);

        return { error: null };
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.detail) {
          return { error: { message: errData.detail } as any };
        }
      }
    } catch (err) {
      console.warn('[PML Auth] Local signup network error, trying Supabase fallback:', err);
    }

    // 2. Fallback to Supabase
    try {
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
    } catch (e: any) {
      return { error: { message: e.message || 'Unable to connect to authentication server.' } as any };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('pml_local_auth_session');
    try {
      const token = session?.access_token;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      }
      await supabase.auth.signOut().catch(() => {});
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
