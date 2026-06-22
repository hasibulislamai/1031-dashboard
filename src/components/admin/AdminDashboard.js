import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function AdminDashboard({ session }) {
  const [tenants, setTenants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let result = tenants;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        (t.owner_name || '').toLowerCase().includes(q) ||
        (t.last_name || '').toLowerCase().includes(q) ||
        (t.owner_email || '').toLowerCase().includes(q) ||
        (t.company_name || '').toLowerCase().includes(q) ||
        (t.phone || '').includes(q)
      );
    }
    if (planFilter !== 'all') result = result.filter(t => t.plan === planFilter);
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    setFiltered(result);
  }, [search, planFilter, statusFilter, tenants]);

  async function loadData() {
    setLoading(true);
    const { data: t } = await supabase.from('wb_tenants').select('*').order('created_at', { ascending: false });
    setTenants(t || []);
    const active = (t || []).filter(x => x.status === 'active').length;
    const suspended = (t || []).filter(x => x.status === 'suspended').length;
    const rev = (t || []).filter(x => x.status === 'active').reduce((s, x) => s + (x.plan === 'pro' ? 149 : x.plan === 'enterprise' ? 997 : 49), 0);
    setStats({ total: (t || []).length, active, revenue: rev, suspended });
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

  async function deleteTenant(id) {
    await supabase.from('wb_tenants').delete().eq('id', id);
    setDeleteConfirm(null);
    loadData();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const planColor = (plan) => plan === 'pro' ? '#3b82f6' : plan === 'enterprise' ? '#f59e0b' : '#16A34A';
  const planBg = (plan) => plan === 'pro' ? '#0a1628' : plan === 'enterprise' ? '#1a1000' : '#0a2a0a';

  const s = { fontFamily: 'Inter, sans-serif', background: '#0a0a0a', minHeight: '100vh', color: '#fff' };
  const card = { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px' };
  const input = { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '8px 14px', color: '#fff', fontSize: '0.85rem', outline: 'none' };

  return (
    <div style={s}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#16A34A' }}>⚡ WealthBuilder 1031</span>
          <span style={{ background: '#1a2a1a', border: '1px solid #16A34A', borderRadius: '6px', padding: '2px 10px', color: '#16A34A', fontSize: '0.75rem' }}>SUPER ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#666', fontSize: '0.8rem' }}>{session?.user?.email}</span>
          <button onClick={handleSignOut} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '8px 16px', color: '#999', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Advisors', value: stats.total, color: '#16A34A', icon: '👥' },
            { label: 'Active', value: stats.active, color: '#3b82f6', icon: '✅' },
            { label: 'Monthly Revenue', value: `$${stats.revenue.toLocaleString()}`, color: '#f59e0b', icon: '💰' },
            { label: 'Suspended', value: stats.suspended, color: '#ef4444', icon: '🚫' },
          ].map((item, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: item.color }}>{item.value}</div>
                </div>
                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Plan Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {['basic', 'pro', 'enterprise'].map(plan => {
            const count = tenants.filter(t => t.plan === plan && t.status === 'active').length;
            const price = plan === 'pro' ? 149 : plan === 'enterprise' ? 997 : 49;
            return (
              <div key={plan} style={{ ...card, borderColor: planColor(plan) + '44' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: planColor(plan), fontWeight: '700', textTransform: 'uppercase', fontSize: '0.85rem' }}>{plan}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{count} advisors</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#666', fontSize: '0.75rem' }}>Revenue</div>
                    <div style={{ color: planColor(plan), fontWeight: '700', fontSize: '1.1rem' }}>${(count * price).toLocaleString()}/mo</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={{ ...input, flex: 1, minWidth: '200px' }}
              placeholder="🔍 Search by name, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
              style={{ ...input, cursor: 'pointer' }}>
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ ...input, cursor: 'pointer' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button onClick={loadData} style={{ background: '#1a2a1a', border: '1px solid #16A34A', borderRadius: '8px', padding: '8px 16px', color: '#16A34A', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              🔄 Refresh
            </button>
          </div>
          <div style={{ marginTop: '10px', color: '#666', fontSize: '0.8rem' }}>
            Showing {filtered.length} of {tenants.length} advisors
          </div>
        </div>

        {/* Tenants Table */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '1.1rem' }}>All Advisors</h2>

          {loading ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Name', 'Email', 'Phone', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#666', fontSize: '0.8rem', fontWeight: '600' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No advisors found</td></tr>
                  ) : filtered.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{t.owner_name} {t.last_name}</div>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '2px' }}>{t.company_name}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#888', fontSize: '0.85rem' }}>{t.owner_email}</td>
                      <td style={{ padding: '12px', color: '#888', fontSize: '0.85rem' }}>{t.phone || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <select value={t.plan || 'basic'} onChange={e => updatePlan(t.id, e.target.value)}
                          style={{ background: planBg(t.plan), border: `1px solid ${planColor(t.plan)}44`, borderRadius: '6px', padding: '4px 8px', color: planColor(t.plan), cursor: 'pointer', fontSize: '0.8rem' }}>
                          <option value="basic">Basic $49</option>
                          <option value="pro">Pro $149</option>
                          <option value="enterprise">Enterprise $997</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: t.status === 'active' ? '#0a2a0a' : '#2a0a0a', color: t.status === 'active' ? '#16A34A' : '#ef4444', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem' }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#666', fontSize: '0.8rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => toggleStatus(t.id, t.status)}
                            style={{ background: t.status === 'active' ? '#2a0a0a' : '#0a2a0a', border: 'none', borderRadius: '6px', padding: '6px 10px', color: t.status === 'active' ? '#ef4444' : '#16A34A', cursor: 'pointer', fontSize: '0.75rem' }}>
                            {t.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button onClick={() => setDeleteConfirm(t.id)}
                            style={{ background: '#1a0a0a', border: 'none', borderRadius: '6px', padding: '6px 10px', color: '#666', cursor: 'pointer', fontSize: '0.75rem' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px', color: '#ef4444' }}>⚠️ Delete Advisor?</div>
            <div style={{ color: '#888', marginBottom: '24px', fontSize: '0.9rem' }}>This will permanently delete this advisor and all their data. This cannot be undone.</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => deleteTenant(deleteConfirm)}
                style={{ flex: 1, background: '#ef4444', border: 'none', borderRadius: '8px', padding: '12px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                Yes, Delete
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#999', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
