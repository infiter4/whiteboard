import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check and create profile in background (don't block loading)
      if (session?.user) {
        (async () => {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();

            if (!existingProfile) {
              const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              
              // Generate username with better fallback logic
              let username = session.user.user_metadata?.full_name 
                || session.user.user_metadata?.name
                || session.user.email?.split('@')[0] 
                || `user_${session.user.id.slice(0, 8)}`;
              
              // Clean username: remove spaces, special chars, make lowercase
              username = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');

              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  username: username,
                  full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
                  avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
                  user_color: randomColor,
                  updated_at: new Date().toISOString(),
                });
              
              if (insertError) {
                console.error('Failed to create profile:', insertError);
              }
            }
          } catch (error) {
            console.error('Profile check/creation error:', error);
          }
        })();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Auto-create profile for OAuth users (Google, etc.)
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          // If no profile exists, create one
          if (!existingProfile) {
            const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            // Generate username with better fallback logic
            let username = session.user.user_metadata?.full_name 
              || session.user.user_metadata?.name
              || session.user.email?.split('@')[0] 
              || `user_${session.user.id.slice(0, 8)}`;
            
            // Clean username: remove spaces, special chars, make lowercase
            username = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                username: username,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
                user_color: randomColor,
                updated_at: new Date().toISOString(),
              });
            
            if (insertError) {
              console.error('Failed to create profile on sign in:', insertError);
            }
          }
        } catch (error) {
          console.error('Profile creation error on sign in:', error);
          // Continue anyway - user is still authenticated
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    // Clean the email and username
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // First, try to sign up the user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      // Handle specific error cases
      if (signUpError.message.includes('already registered')) {
        throw new Error('A user with this email already exists.');
      }
      throw signUpError;
    }

    // If we have a user, create their profile
    if (data.user) {
      const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Use upsert to handle potential race conditions
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: cleanUsername,
          user_color: randomColor,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Instead of trying to delete the auth user (which requires admin privileges),
        // we'll just throw a user-friendly error
        throw new Error('Account created, but there was an issue setting up your profile. Please contact support.');
      }
    }
  };


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
