import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function AdminDashboard({ session }) {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: t } = await supabase.from('wb_tenants').select('*').order('created_at', { ascending: false });
    const { data: d } = await supabase.from('ex_deals').select('sale_amount');
    setTenants(t || []);
    const active = (t || []).filter(x => x.status === 'active').length;
    const rev = (t || []).reduce((s, x) => s + (x.plan === 'pro' ? 297 : x.plan === 'enterprise' ? 997 : 97), 0);
    setStats({ total: (t || []).length, active, revenue: rev });
    setLoading(false);
  }

  async function updatePlan(id, plan) {
    const limits = { basic: 10, pro: 500, enterprise: 999999 };
    await supabase.from('wb_tenants').update({ plan, client_limit: limits[plan] }).eq('id', id);
    loadData();
  }

  async function toggleStatus(id, status) {
    await supabase.from('wb_tenants').update({ status: status === 'active' ? 'suspended' : 'active' }).eq('id', id);
    loadData();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const s = { fontFamily: 'Inter, sans-serif', background: '#0a0a0a', minHeight: '100vh', color: '#fff' };
  const card = { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' };

  return (
    <div style={s}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#16A34A' }}>⚡ WealthBuilder 1031</span>
          <span style={{ background: '#1a2a1a', border: '1px solid #16A34A', borderRadius: '6px', padding: '2px 10px', color: '#16A34A', fontSize: '0.75rem' }}>SUPER ADMIN</span>
        </div>
        <button onClick={handleSignOut} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '8px 16px', color: '#999', cursor: 'pointer' }}>Sign Out</button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Advisors', value: stats.total, color: '#16A34A' },
            { label: 'Active', value: stats.active, color: '#3b82f6' },
            { label: 'MRR', value: `$${stats.revenue.toLocaleString()}`, color: '#f59e0b' },
            { label: 'Suspended', value: stats.total - stats.active, color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} style={card}>
              <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '8px' }}>{item.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Tenants Table */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>All Advisors</h2>
            <button onClick={loadData} style={{ background: '#1a2a1a', border: '1px solid #16A34A', borderRadius: '8px', padding: '8px 16px', color: '#16A34A', cursor: 'pointer', fontSize: '0.85rem' }}>🔄 Refresh</button>
          </div>

          {loading ? <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>Loading...</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Company', 'Email', 'Plan', 'Status', 'Client Limit', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#666', fontSize: '0.8rem', fontWeight: '600' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No advisors yet</td></tr>
                  ) : tenants.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px' }}><div style={{ fontWeight: '600', color: '#fff' }}>{t.company_name}</div></td>
                      <td style={{ padding: '12px', color: '#888', fontSize: '0.85rem' }}>{t.owner_email}</td>
                      <td style={{ padding: '12px' }}>
                        <select value={t.plan} onChange={e => updatePlan(t.id, e.target.value)}
                          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', color: t.plan === 'pro' ? '#3b82f6' : t.plan === 'enterprise' ? '#f59e0b' : '#16A34A', cursor: 'pointer', fontSize: '0.8rem' }}>
                          <option value="basic">Basic $97</option>
                          <option value="pro">Pro $297</option>
                          <option value="enterprise">Enterprise $997</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: t.status === 'active' ? '#0a2a0a' : '#2a0a0a', color: t.status === 'active' ? '#16A34A' : '#ef4444', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem' }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#888' }}>{t.client_limit === 999999 ? 'Unlimited' : t.client_limit}</td>
                      <td style={{ padding: '12px', color: '#666', fontSize: '0.8rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => toggleStatus(t.id, t.status)}
                          style={{ background: t.status === 'active' ? '#2a0a0a' : '#0a2a0a', border: 'none', borderRadius: '6px', padding: '6px 12px', color: t.status === 'active' ? '#ef4444' : '#16A34A', cursor: 'pointer', fontSize: '0.8rem' }}>
                          {t.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
