import { useState, useEffect, useCallback } from 'react';
import { supabase, PLANS } from '../../supabase';
import { C, Badge, Btn, Toasts, MetricCard, Modal, Field, Input, Select, EmptyState, fmtDate, fmtMoney, useToast, useConfirm, Confirm, Section } from '../shared';
import { Users, DollarSign, Activity, Settings, LogOut, Shield, TrendingUp, Plus, Trash2, Edit, ToggleLeft, ToggleRight, RefreshCw, Building2 } from 'lucide-react';

const NAV = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'tenants', label: 'Tenants', icon: Users },
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard({ session }) {
  const [page, setPage] = useState('overview');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const { toasts, toast } = useToast();
  const { confirmState, confirm, cancelConfirm } = useConfirm();

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('wb_tenants').select('*').order('created_at', { ascending: false });
    setTenants(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const signOut = async () => { await supabase.auth.signOut(); };

  const toggleStatus = async (t) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await supabase.from('wb_tenants').update({ status: newStatus }).eq('id', t.id);
    setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    toast(`Tenant ${newStatus}`);
  };

  const upgradePlan = async (id, plan) => {
    const limit = PLANS[plan]?.client_limit || 10;
    await supabase.from('wb_tenants').update({ plan, client_limit: limit }).eq('id', id);
    setTenants(prev => prev.map(x => x.id === id ? { ...x, plan, client_limit: limit } : x));
    toast('Plan updated');
  };

  const deleteTenant = async (id) => {
    await supabase.from('wb_tenants').delete().eq('id', id);
    setTenants(prev => prev.filter(x => x.id !== id));
    toast('Tenant deleted', 'error');
  };

  // Metrics
  const active = tenants.filter(t => t.status === 'active').length;
  const suspended = tenants.filter(t => t.status === 'suspended').length;
  const revenue = tenants.filter(t => t.status === 'active').reduce((s, t) => s + (PLANS[t.plan]?.price || 0), 0);
  const proCount = tenants.filter(t => t.plan === 'pro').length;
  const enterpriseCount = tenants.filter(t => t.plan === 'enterprise').length;

  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',system-ui,sans-serif", background: C.bgAlt }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, background: '#7C3AED', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>A</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Super Admin</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>WealthBuilder 1031</div>
            </div>
          </div>
          <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: C.textMuted }}>{clock}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: '#EDE9FE', color: '#6D28D9', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
            <Shield size={10} /> ADMIN
          </div>
        </div>
        <nav style={{ flex: 1, padding: '8px' }}>
          {NAV.map(n => {
            const Icon = n.icon; const active = page === n.key;
            return (
              <button key={n.key} onClick={() => setPage(n.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', background: active ? '#EDE9FE' : 'transparent', color: active ? '#6D28D9' : C.text, fontWeight: active ? 500 : 400 }}>
                <Icon size={16} style={{ flexShrink: 0 }} />{n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 8, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => confirm({ title: 'Sign out?', message: 'Are you sure?', confirmLabel: 'Sign out', onConfirm: signOut })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: C.textMuted, fontFamily: 'inherit' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {page === 'overview' && (
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 20 }}>Platform Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 24 }}>
              <MetricCard label="Total Tenants" value={tenants.length} icon={Users} />
              <MetricCard label="Active" value={active} color="green" icon={Activity} />
              <MetricCard label="Suspended" value={suspended} color="red" icon={ToggleLeft} />
              <MetricCard label="Pro/Enterprise" value={proCount + enterpriseCount} color="purple" icon={TrendingUp} />
              <MetricCard label="MRR" value={`$${revenue.toLocaleString()}`} color="green" icon={DollarSign} />
            </div>

            {/* Plan breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
              {Object.entries(PLANS).map(([key, plan]) => {
                const count = tenants.filter(t => t.plan === key && t.status === 'active').length;
                return (
                  <div key={key} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>{plan.name}</div>
                      <Badge color={key === 'enterprise' ? 'purple' : key === 'pro' ? 'blue' : 'gray'}>${plan.price}/mo</Badge>
                    </div>
                    <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 24, fontWeight: 600, color: C.text }}>{count}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>active tenants · ${(count * plan.price).toLocaleString()} MRR</div>
                  </div>
                );
              })}
            </div>

            {/* Recent tenants */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Recent tenants</h2>
                <button onClick={() => setPage('tenants')} style={{ fontSize: 12, color: '#15803D', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              <TenantTable tenants={tenants.slice(0, 5)} onToggle={toggleStatus} onUpgrade={upgradePlan} onDelete={(t) => confirm({ title: 'Delete tenant?', message: `Delete ${t.company_name}?`, danger: true, confirmLabel: 'Delete', onConfirm: () => deleteTenant(t.id) })} />
            </div>
          </div>
        )}

        {page === 'tenants' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Tenants ({tenants.length})</h1>
              <Btn onClick={load}><RefreshCw size={13} /> Refresh</Btn>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <TenantTable tenants={tenants} onToggle={toggleStatus} onUpgrade={upgradePlan} onDelete={(t) => confirm({ title: 'Delete tenant?', message: `Delete ${t.company_name}? This cannot be undone.`, danger: true, confirmLabel: 'Delete', onConfirm: () => deleteTenant(t.id) })} />
            </div>
          </div>
        )}

        {page === 'revenue' && (
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 20 }}>Revenue</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              <MetricCard label="Monthly Recurring Revenue" value={`$${revenue.toLocaleString()}`} color="green" />
              <MetricCard label="Annual Run Rate" value={`$${(revenue * 12).toLocaleString()}`} color="green" />
              <MetricCard label="Avg Revenue Per Tenant" value={tenants.length ? `$${Math.round(revenue / Math.max(active, 1))}` : '$0'} />
            </div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Revenue by plan</h2>
              {Object.entries(PLANS).map(([key, plan]) => {
                const count = tenants.filter(t => t.plan === key && t.status === 'active').length;
                const planRevenue = count * plan.price;
                const pct = revenue > 0 ? (planRevenue / revenue) * 100 : 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.text, fontWeight: 500, textTransform: 'capitalize' }}>{plan.name}</span>
                      <span style={{ color: C.textMuted }}>{count} tenants · ${planRevenue.toLocaleString()}/mo</span>
                    </div>
                    <div style={{ height: 6, background: C.bgAlt, borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: key === 'enterprise' ? '#7C3AED' : key === 'pro' ? '#2563EB' : '#16A34A', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {page === 'settings' && (
          <div style={{ maxWidth: 600 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>Admin Settings</h1>
            <Section title="Platform info">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                {[['Admin email', session.user.email], ['Total tenants', tenants.length], ['Active tenants', active], ['MRR', `$${revenue.toLocaleString()}`]].map(([l, v]) => (
                  <div key={l} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{l}</div>
                    <div style={{ fontWeight: 500, color: C.text }}>{v}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </main>

      <Confirm state={confirmState} onCancel={cancelConfirm} />
      <Toasts toasts={toasts} />
    </div>
  );
}

function TenantTable({ tenants, onToggle, onUpgrade, onDelete }) {
  if (tenants.length === 0) return <EmptyState icon={Users} text="No tenants yet." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Company', 'Email', 'Plan', 'Clients', 'Status', 'Created', 'Actions'].map(h => (
              <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenants.map(t => (
            <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: C.text }}>{t.company_name}</td>
              <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{t.owner_email}</td>
              <td style={{ padding: '10px 12px' }}>
                <select value={t.plan} onChange={e => onUpgrade(t.id, e.target.value)} style={{ fontSize: 11, padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, background: '#fff', cursor: 'pointer' }}>
                  <option value="basic">Basic $97</option>
                  <option value="pro">Pro $297</option>
                  <option value="enterprise">Enterprise $997</option>
                </select>
              </td>
              <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{t.client_limit === 999999 ? '∞' : t.client_limit}</td>
              <td style={{ padding: '10px 12px' }}>
                <Badge color={t.status === 'active' ? 'green' : 'red'}>{t.status}</Badge>
              </td>
              <td style={{ padding: '10px 12px', fontSize: 11, color: C.textMuted, fontFamily: 'ui-monospace,monospace' }}>{fmtDate(t.created_at)}</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onToggle(t)} title={t.status === 'active' ? 'Suspend' : 'Activate'} style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', background: t.status === 'active' ? '#FEF3C7' : '#DCFCE7', color: t.status === 'active' ? '#B45309' : '#15803D', fontSize: 10, fontWeight: 500 }}>
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button onClick={() => onDelete(t)} style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 500 }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
