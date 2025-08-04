
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: any;
  profile: any;
  session: any;
  loading: boolean;
  authInitialized: boolean;
  licenseCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [licenseCount, setLicenseCount] = useState<number>(0);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let sessionFetched = false;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }

        if (mounted && !sessionFetched) {
          sessionFetched = true;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user);
          }
          
          setAuthInitialized(true);
          setLoading(false);
          console.log('Auth initialization complete');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthInitialized(true);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;

        // Handle token refresh separately to prevent unnecessary profile fetches
        if (event === 'TOKEN_REFRESHED' && sessionFetched) {
          setSession(session);
          return;
        }

        // Handle other auth events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Only fetch profile for actual sign in events, not token refreshes
            setTimeout(() => {
              if (mounted) {
                fetchUserProfile(session.user);
              }
            }, 0);
          } else if (!session?.user) {
            setProfile(null);
            setLicenseCount(0);
          }

          // Only set loading to false after initial setup
          if (authInitialized) {
            setLoading(false);
          }
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove authInitialized dependency to prevent loops

  const fetchUserProfile = async (user: any) => {
    try {
      console.log('Fetching profile for user:', user.id);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log('Profile loaded:', profileData);
      setProfile(profileData);
      
      // Fetch subscription data for license count
      if (profileData.role === 'Admin') {
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('licenses_purchased')
          .eq('user_id', user.id)
          .single();
        
        if (subscriber) {
          setLicenseCount(subscriber.licenses_purchased);
        }
      }
    } catch (error) {
      console.error('Error in profile fetch:', error);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    authInitialized,
    licenseCount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
