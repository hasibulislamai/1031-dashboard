import { useState, useEffect, useCallback } from 'react';
import { supabase, SUPER_ADMIN_EMAIL } from './supabase';
import Auth from './components/Auth';
import AdminDashboard from './components/admin/AdminDashboard';
import TenantDashboard from './components/tenant/TenantDashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null); // 'admin' | 'tenant'
  const [tenant, setTenant] = useState(null);

  const resolveUser = useCallback(async (session) => {
    if (!session) { setLoading(false); return; }
    const email = session.user.email;

    // Check if super admin
    if (email === SUPER_ADMIN_EMAIL) {
      setUserType('admin');
      setLoading(false);
      return;
    }

    // Check if tenant exists
    const { data: tenantData } = await supabase
      .from('wb_tenants')
      .select('*')
      .eq('owner_email', email)
      .single();

    if (tenantData) {
      setTenant(tenantData);
      setUserType('tenant');
    } else {
      // New user — create basic tenant
      const { data: newTenant } = await supabase
        .from('wb_tenants')
        .insert({
          company_name: email.split('@')[0] + "'s 1031 Exchange",
          owner_email: email,
          owner_name: email.split('@')[0],
          plan: 'basic',
          client_limit: 10,
          status: 'active'
        })
        .select()
        .single();
      setTenant(newTenant);
      setUserType('tenant');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      resolveUser(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) resolveUser(session);
      else { setUserType(null); setTenant(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, [resolveUser]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
      <Loader2 size={28} style={{ color: '#16A34A', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) return <Auth />;
  if (userType === 'admin') return <AdminDashboard session={session} />;
  if (userType === 'tenant') return <TenantDashboard session={session} tenant={tenant} setTenant={setTenant} />;

  return null;
}
