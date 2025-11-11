// FIX: Provide implementation for the main App component.
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseService';
import { Session } from '@supabase/supabase-js';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import type { User as AppUser } from './types';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSessionAndUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      } else {
        setSession(session);
        if (session?.user) {
          setAppUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          });
        }
      }
      setLoading(false);
    };

    getSessionAndUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setAppUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        });
      } else {
        setAppUser(null);
      }
      // When auth state changes, we are no longer in the initial loading state.
      if (loading) {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loading]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if(error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session || !appUser) {
    return <Login onLogin={() => { /* onAuthStateChange handles session update */ }} />;
  }

  return <Dashboard user={appUser} onLogout={handleLogout} />;
};

export default App;
