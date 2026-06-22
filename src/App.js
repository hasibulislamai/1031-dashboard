import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import AdminDashboard from './components/admin/AdminDashboard';
import TenantDashboard from './components/tenant/TenantDashboard';

const OWNER_EMAIL = 'hxb2693894@gmail.com';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'owner', 'admin', 'tenant'
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserRole(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserRole(session.user);
      else {
        setUserRole(null);
        setTenant(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserRole(user) {
    setLoading(true);

    // Check if OWNER
    if (user.email === OWNER_EMAIL) {
      setUserRole('owner');
      setLoading(false);
      return;
    }

    // Check if ADMIN (from wb_admins table)
    const { data: adminData } = await supabase
      .from('wb_admins')
      .select('role')
      .eq('email', user.email)
      .single();

    if (adminData) {
      setUserRole('admin');
      setLoading(false);
      return;
    }

    // Otherwise TENANT
    const { data } = await supabase
      .from('wb_tenants')
      .select('*')
      .eq('owner_email', user.email)
      .single();

    if (data) {
      setTenant(data);
    } else {
      // Auto-create tenant on first login
      const { data: newTenant } = await supabase
        .from('wb_tenants')
        .insert({
          company_name: user.email.split('@')[0],
          owner_email: user.email,
          owner_name: ''
        })
        .select()
        .single();
      if (newTenant) setTenant(newTenant);
    }

    setUserRole('tenant');
    setLoading(false);
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0a0a0a', color: '#16A34A', fontSize: '1.2rem'
    }}>
      Loading WealthBuilder 1031...
    </div>
  );

  if (!session) return <Auth />;
  if (userRole === 'owner' || userRole === 'admin') return <AdminDashboard session={session} userRole={userRole} />;
  return <TenantDashboard session={session} tenant={tenant} />;
}
