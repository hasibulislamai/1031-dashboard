import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [checkSession]);

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F7F5' }}>
      <Loader2 size={24} style={{ animation:'spin 1s linear infinite', color:'#16A34A' }} />
    </div>
  );

  return session ? <Dashboard session={session} /> : <Auth />;
}
