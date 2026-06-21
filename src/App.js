import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import AdminDashboard from './components/admin/AdminDashboard';
import TenantDashboard from './components/tenant/TenantDashboard';

const SUPER_ADMIN_EMAIL = 'hxb2693894@gmail.com';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserRole(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserRole(session.user);
      else { setIsAdmin(false); setTenant(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserRole(user) {
    if (user.email === SUPER_ADMIN_EMAIL) {
      setIsAdmin(true);
      return;
    }
    // Check if tenant exists
    const { data } = await supabase
      .from('wb_tenants')
      .select('*')
      .eq('owner_email', user.email)
      .single();
    
    if (data) setTenant(data);
    else {
      // Auto-create tenant on first login
      const { data: newTenant } = await supabase
        .from('wb_tenants')
        .insert({ company_name: user.email.split('@')[0], owner_email: user.email, owner_name: '' })
        .select()
        .single();
      if (newTenant) setTenant(newTenant);
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0a', color:'#16A34A', fontSize:'1.2rem' }}>
      Loading WealthBuilder 1031...
    </div>
  );

  if (!session) return <Auth />;
  if (isAdmin) return <AdminDashboard session={session} />;
  return <TenantDashboard session={session} tenant={tenant} />;
}
