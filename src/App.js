import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080808', color:'#00e676', fontFamily:'Inter,sans-serif', fontSize:14 }}>
      Loading...
    </div>
  );

  return session ? <Dashboard user={session.user} onSignOut={signOut} /> : <Auth />;
}
