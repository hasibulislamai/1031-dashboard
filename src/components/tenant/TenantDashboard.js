import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, N8N_BASE, PLANS } from '../../supabase';
import {
  C, Badge, Btn, IconBtn, Field, Input, Select, Modal, Toasts, MetricCard,
  EmptyState, Section, fmtDate, fmtMoney, fmtShort, getDealUrgency, useToast,
  useConfirm, Confirm, addDays, genId
} from '../shared';
import {
  LayoutDashboard, Briefcase, Building2, Mail, BarChart3, CalendarClock,
  FileSpreadsheet, Settings as SettingsIcon, TrendingUp, LogOut, Search,
  Plus, X, Trash2, Pencil, Send, Target, Loader2, Upload, Download,
  ChevronRight, CheckCircle2, Clock, KeyRound, Webhook, Copy,
  Calendar, Users, DollarSign, FileText, Image, Palette
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Papa from 'papaparse';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'deals', label: 'Deals', icon: Briefcase },
  { key: 'properties', label: 'Properties', icon: Building2 },
  { key: 'outreach', label: 'Outreach', icon: Mail },
  { key: 'bookings', label: 'Bookings', icon: Calendar },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'deadlines', label: 'Deadlines', icon: CalendarClock },
  { key: 'csv', label: 'CSV Upload', icon: FileSpreadsheet },
  { key: 'insights', label: 'Insights', icon: TrendingUp },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

const PROP_TYPES = ['Retail', 'Office', 'Industrial', 'Multifamily'];

// Export helpers
function exportCSV(data, filename) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function TenantDashboard({ session, tenant, setTenant }) {
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({ hourly_rate: 150, fee_percent: 1, subscription_cost: PLANS[tenant?.plan]?.price || 97, webhook_outgoing: '' });
  const [now, setNow] = useState(new Date());
  const { toasts, toast } = useToast();
  const { confirmState, confirm, cancelConfirm } = useConfirm();

  // Modals
  const [drawerDeal, setDrawerDeal] = useState(null);
  const [matchDeal, setMatchDeal] = useState(null);
  const [outreachDeal, setOutreachDeal] = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [propModal, setPropModal] = useState(null);
  const [showLogOutreach, setShowLogOutreach] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const plan = PLANS[tenant?.plan] || PLANS.basic;
  const primaryColor = tenant?.primary_color || '#16A34A';

  // Load data
  const load = useCallback(async () => {
    setLoading(true);
    const tid = tenant?.id;
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('ex_deals').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('ex_properties').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('ex_broker_outreach').select('*').eq('tenant_id', tid).order('sent_at', { ascending: false }),
      supabase.from('wb_bookings').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).catch(() => ({ data: [] })),
      supabase.from('wb_settings').select('*').eq('tenant_id', tid).single().catch(() => ({ data: null })),
    ]);
    setDeals(r1.data || []);
    setProperties(r2.data || []);
    setOutreach(r3.data || []);
    setBookings(r4.data || []);
    if (r5.data) setSettings(r5.data);
    setLoading(false);
  }, [tenant?.id]);

  useEffect(() => { if (tenant?.id) load(); }, [load, tenant?.id]);

  // Check client limit
  const canAddClient = deals.filter(d => d.status !== 'closed').length < (tenant?.client_limit || 10);

  // Outgoing webhook
  const fireWebhook = useCallback(async (event, payload) => {
    if (!settings.webhook_outgoing) return;
    try { fetch(settings.webhook_outgoing, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, source: 'WealthBuilder1031', tenant_id: tenant?.id, timestamp: new Date().toISOString(), payload }) }); } catch { }
  }, [settings.webhook_outgoing, tenant?.id]);

  // Deal CRUD
  const createDeal = async (f) => {
    if (!canAddClient) { toast(`Plan limit reached (${tenant?.client_limit} clients). Upgrade to add more.`, 'error'); return; }
    const sale = new Date(f.sale_date);
    const { data, error } = await supabase.from('ex_deals').insert({
      client_name: f.client_name, client_email: f.client_email, client_phone: f.client_phone,
      sale_date: sale.toISOString(), sale_amount: f.sale_amount, property_sold_type: f.property_type,
      property_sold_address: f.property_address,
      deadline_45: addDays(sale, 45).toISOString().split('T')[0],
      deadline_180: addDays(sale, 180).toISOString().split('T')[0],
      status: 'active', properties_matched: 0, tenant_id: tenant?.id
    }).select().single();
    if (error) { toast(error.message, 'error'); return; }
    setDeals(d => [data, ...d]);
    setShowNewDeal(false);
    toast('Deal created');
    await fireWebhook('deal.created', data);
  };

  const updateDeal = async (id, patch) => {
    const { error } = await supabase.from('ex_deals').update(patch).eq('id', id).eq('tenant_id', tenant?.id);
    if (error) { toast(error.message, 'error'); return; }
    setDeals(d => d.map(x => x.id === id ? { ...x, ...patch } : x));
    setDrawerDeal(null); toast('Deal updated');
    await fireWebhook('deal.updated', { id, ...patch });
  };

  const deleteDeal = async (id) => {
    await supabase.from('ex_broker_outreach').delete().eq('deal_id', id);
    await supabase.from('ex_deals').delete().eq('id', id).eq('tenant_id', tenant?.id);
    setDeals(d => d.filter(x => x.id !== id));
    toast('Deal deleted', 'error');
  };

  const markMatched = async (deal, prop) => {
    const key = `match-${deal.id}`;
    setActionLoading(a => ({ ...a, [key]: true }));
    const count = (deal.properties_matched || 0) + 1;
    await supabase.from('ex_deals').update({ properties_matched: count }).eq('id', deal.id);
    setDeals(d => d.map(x => x.id === deal.id ? { ...x, properties_matched: count } : x));
    setMatchDeal(null); toast('Property matched');
    await fireWebhook('property.matched', { deal_id: deal.id, property_id: prop.id });
    setActionLoading(a => ({ ...a, [key]: false }));
  };

  const sendOutreach = async (deal, prop) => {
    const key = `out-${deal.id}`;
    setActionLoading(a => ({ ...a, [key]: true }));
    const entry = { deal_id: deal.id, property_id: prop.id, broker_email: prop.broker_email, sent_at: new Date().toISOString(), status: 'sent', tenant_id: tenant?.id };
    const { data, error } = await supabase.from('ex_broker_outreach').insert(entry).select().single();
    if (error) { toast(error.message, 'error'); setActionLoading(a => ({ ...a, [key]: false })); return; }
    try { await fetch(`${N8N_BASE}/1031-broker-outreach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deal_id: deal.id, target_state: 'TX', target_property_type: deal.property_sold_type || 'retail', max_budget: deal.sale_amount, client_name: deal.client_name, client_email: deal.client_email }) }); } catch { }
    setOutreach(o => [data, ...o]);
    setOutreachDeal(null); setShowLogOutreach(false);
    toast('Outreach sent');
    await fireWebhook('outreach.sent', { deal_id: deal.id, broker_email: prop.broker_email });
    setActionLoading(a => ({ ...a, [key]: false }));
  };

  // Property CRUD
  const saveProperty = async (data) => {
    if (propModal?.mode === 'edit') {
      const { error } = await supabase.from('ex_properties').update(data).eq('id', data.id).eq('tenant_id', tenant?.id);
      if (error) { toast(error.message, 'error'); return; }
      setProperties(p => p.map(x => x.id === data.id ? data : x));
      toast('Property updated');
    } else {
      const { data: nd, error } = await supabase.from('ex_properties').insert({ ...data, tenant_id: tenant?.id }).select().single();
      if (error) { toast(error.message, 'error'); return; }
      setProperties(p => [nd, ...p]);
      toast('Property added');
    }
    setPropModal(null);
  };

  const deleteProperty = async (id) => {
    await supabase.from('ex_properties').delete().eq('id', id).eq('tenant_id', tenant?.id);
    setProperties(p => p.filter(x => x.id !== id));
    toast('Property deleted', 'error');
  };

  // Bookings
  const createBooking = async (f) => {
    const { data, error } = await supabase.from('wb_bookings').insert({ ...f, tenant_id: tenant?.id, status: 'confirmed' }).select().single();
    if (error) { toast(error.message, 'error'); return; }
    setBookings(b => [data, ...b]);
    setShowNewBooking(false);
    toast('Booking created');
  };

  // Export
  const exportDeals = (format) => {
    const data = deals.map(d => ({ client_name: d.client_name, client_email: d.client_email, sale_amount: d.sale_amount, property_type: d.property_sold_type, status: d.status, deadline_45: d.deadline_45, deadline_180: d.deadline_180 }));
    if (format === 'csv') exportCSV(data, 'deals.csv');
    else exportJSON(data, 'deals.json');
    toast(`Exported ${deals.length} deals as ${format.toUpperCase()}`);
  };

  const exportProperties = (format) => {
    const data = properties.map(p => ({ address: p.address, city: p.city, state: p.state, price: p.price, cap_rate: p.cap_rate, property_type: p.property_type, broker_name: p.broker_name, broker_email: p.broker_email }));
    if (format === 'csv') exportCSV(data, 'properties.csv');
    else exportJSON(data, 'properties.json');
    toast(`Exported ${properties.length} properties as ${format.toUpperCase()}`);
  };

  // CSV import
  const importDeals = async (items) => {
    if (!canAddClient) { toast('Plan limit reached. Upgrade to import more.', 'error'); return; }
    const built = items.map(it => {
      const s = it.sale_date ? new Date(it.sale_date) : new Date();
      return { client_name: it.client_name || 'Unknown', client_email: it.client_email || '', sale_date: s.toISOString(), sale_amount: Number(it.sale_amount) || 0, property_sold_type: it.property_type || 'Retail', property_sold_address: it.property_address || '', deadline_45: addDays(s, 45).toISOString().split('T')[0], deadline_180: addDays(s, 180).toISOString().split('T')[0], status: 'active', properties_matched: 0, tenant_id: tenant?.id };
    });
    const { data, error } = await supabase.from('ex_deals').insert(built).select();
    if (error) { toast(error.message, 'error'); return; }
    setDeals(d => [...(data || []), ...d]);
    toast(`Imported ${(data || []).length} deals`);
  };

  const importProperties = async (items) => {
    const built = items.map(it => ({ address: it.address || '', city: it.city || '', state: it.state || '', price: Number(it.price) || 0, cap_rate: Number(it.cap_rate) || 0, property_type: it.property_type || 'Retail', broker_name: it.broker_name || '', broker_email: it.broker_email || '', broker_phone: it.broker_phone || '', noi: Math.round((Number(it.price) || 0) * ((Number(it.cap_rate) || 0) / 100)), tenant_id: tenant?.id }));
    const { data, error } = await supabase.from('ex_properties').insert(built).select();
    if (error) { toast(error.message, 'error'); return; }
    setProperties(p => [...(data || []), ...p]);
    toast(`Imported ${(data || []).length} properties`);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Metrics
  const active = deals.filter(d => d.status !== 'closed');
  const urgent = active.filter(d => { const u = getDealUrgency(d); return u.key === 'critical' || u.key === 'urgent'; });
  const pipeline = active.reduce((s, d) => s + d.sale_amount, 0);
  const replied = outreach.filter(o => o.status === 'replied').length;

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgAlt }}>
      <Loader2 size={24} style={{ color: primaryColor, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter',system-ui,sans-serif", background: C.bgAlt }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt="logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 28, height: 28, background: primaryColor, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {(tenant?.company_name || 'W')[0]}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant?.company_name || 'WealthBuilder 1031'}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>1031 Exchange</div>
            </div>
          </div>
          <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: C.textMuted }}>{clock}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Badge color={tenant?.plan === 'enterprise' ? 'purple' : tenant?.plan === 'pro' ? 'blue' : 'gray'}>{(tenant?.plan || 'basic').toUpperCase()}</Badge>
            <span style={{ fontSize: 10, color: C.textMuted }}>{active.length}/{tenant?.client_limit === 999999 ? '∞' : tenant?.client_limit} clients</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
          {NAV.map(n => {
            const isActive = page === n.key; const Icon = n.icon;
            return (
              <button key={n.key} onClick={() => setPage(n.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', background: isActive ? `${primaryColor}15` : 'transparent', color: isActive ? primaryColor : C.text, fontWeight: isActive ? 500 : 400 }}>
                <Icon size={16} style={{ flexShrink: 0 }} />{n.label}
              </button>
            );
          })}
        </nav>
        {!canAddClient && (
          <div style={{ margin: 8, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#92400E' }}>
            ⚠️ Client limit reached. <span style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setPage('settings')}>Upgrade plan</span>
          </div>
        )}
        <div style={{ padding: 8, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => confirm({ title: 'Sign out?', message: 'Are you sure?', confirmLabel: 'Sign out', onConfirm: signOut })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent', color: C.textMuted, fontFamily: 'inherit' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {page === 'dashboard' && <DashboardPage deals={deals} properties={properties} outreach={outreach} bookings={bookings} nav={setPage} onRowClick={setDrawerDeal} onMatch={setMatchDeal} onOutreach={setOutreachDeal} onDeleteDeal={d => confirm({ title: 'Delete deal?', message: `Delete ${d.client_name}?`, danger: true, confirmLabel: 'Delete', onConfirm: () => deleteDeal(d.id) })} onNewDeal={() => setShowNewDeal(true)} primaryColor={primaryColor} />}
        {page === 'deals' && <DealsPage deals={deals} onRowClick={setDrawerDeal} onMatch={setMatchDeal} onOutreach={setOutreachDeal} onDelete={d => confirm({ title: 'Delete deal?', message: `Delete ${d.client_name}?`, danger: true, confirmLabel: 'Delete', onConfirm: () => deleteDeal(d.id) })} onNewDeal={() => setShowNewDeal(true)} onExport={exportDeals} primaryColor={primaryColor} />}
        {page === 'properties' && <PropertiesPage properties={properties} onNew={() => setPropModal({ mode: 'new', data: null })} onEdit={p => setPropModal({ mode: 'edit', data: p })} onDelete={p => confirm({ title: 'Delete property?', message: `Remove ${p.address}?`, danger: true, confirmLabel: 'Delete', onConfirm: () => deleteProperty(p.id) })} onExport={exportProperties} primaryColor={primaryColor} />}
        {page === 'outreach' && <OutreachPage outreach={outreach} deals={deals} onLogNew={() => setShowLogOutreach(true)} onExport={() => exportCSV(outreach, 'outreach.csv')} primaryColor={primaryColor} />}
        {page === 'bookings' && <BookingsPage bookings={bookings} deals={deals} onNew={() => setShowNewBooking(true)} onExport={() => exportCSV(bookings, 'bookings.csv')} primaryColor={primaryColor} />}
        {page === 'reports' && <ReportsPage deals={deals} outreach={outreach} bookings={bookings} onExportDeals={() => exportDeals('csv')} primaryColor={primaryColor} />}
        {page === 'deadlines' && <DeadlinesPage deals={deals} primaryColor={primaryColor} />}
        {page === 'csv' && <CSVUploadPage onImportDeals={importDeals} onImportProperties={importProperties} primaryColor={primaryColor} />}
        {page === 'insights' && <InsightsPage deals={deals} outreach={outreach} settings={settings} primaryColor={primaryColor} />}
        {page === 'settings' && <SettingsPage tenant={tenant} setTenant={setTenant} settings={settings} setSettings={setSettings} plan={plan} onToast={toast} onConfirm={confirm} primaryColor={primaryColor} />}
      </main>

      {/* Modals */}
      {drawerDeal && <DealDrawer deal={drawerDeal} properties={properties} outreach={outreach} onClose={() => setDrawerDeal(null)} onSave={updateDeal} primaryColor={primaryColor} />}
      {matchDeal && <MatchModal deal={matchDeal} properties={properties} onClose={() => setMatchDeal(null)} onMatch={markMatched} loading={!!actionLoading[`match-${matchDeal?.id}`]} primaryColor={primaryColor} />}
      {outreachDeal && <OutreachModal deal={outreachDeal} properties={properties} onClose={() => setOutreachDeal(null)} onSend={sendOutreach} loading={!!actionLoading[`out-${outreachDeal?.id}`]} />}
      {showNewDeal && <NewDealModal onClose={() => setShowNewDeal(false)} onCreate={createDeal} primaryColor={primaryColor} />}
      {showLogOutreach && <LogOutreachModal deals={deals} properties={properties} onClose={() => setShowLogOutreach(false)} onSend={sendOutreach} />}
      {propModal && <PropertyModal mode={propModal.mode} data={propModal.data} onClose={() => setPropModal(null)} onSave={saveProperty} />}
      {showNewBooking && <NewBookingModal deals={deals} onClose={() => setShowNewBooking(false)} onCreate={createBooking} />}
      <Confirm state={confirmState} onCancel={cancelConfirm} />
      <Toasts toasts={toasts} />
    </div>
  );
}

// ── Dashboard Page ──
function DashboardPage({ deals, properties, outreach, bookings, nav, onRowClick, onMatch, onOutreach, onDeleteDeal, onNewDeal, primaryColor }) {
  const active = useMemo(() => deals.filter(d => d.status !== 'closed').map(d => ({ d, u: getDealUrgency(d) })).sort((a, b) => (a.u.daysLeft ?? 999) - (b.u.daysLeft ?? 999)).slice(0, 8), [deals]);
  const critical = deals.filter(d => getDealUrgency(d).key === 'critical').length;
  const urgent = deals.filter(d => getDealUrgency(d).key === 'urgent').length;
  const onTrack = deals.filter(d => getDealUrgency(d).key === 'on_track').length;
  const pipeline = deals.filter(d => d.status !== 'closed').reduce((s, d) => s + d.sale_amount, 0);
  const meetings = outreach.filter(o => o.status === 'replied').length;
  const months6 = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const inM = deals.filter(dl => { const sd = new Date(dl.created_at); return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth(); });
      return { month: label, count: inM.length };
    });
  }, [deals]);
  const activity = useMemo(() => [
    ...deals.map(d => ({ date: d.created_at, text: `Deal created — ${d.client_name}` })),
    ...outreach.map(o => ({ date: o.sent_at, text: `Outreach → ${o.broker_email?.split('@')[0]}` })),
    ...bookings.map(b => ({ date: b.created_at, text: `Booking — ${b.client_name}` })),
  ].sort((x, y) => new Date(y.date) - new Date(x.date)).slice(0, 8), [deals, outreach, bookings]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Dashboard</h1>
        <Btn onClick={onNewDeal} style={{ background: primaryColor }}><Plus size={14} /> New deal</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
        <MetricCard label="Critical" value={critical} color="red" />
        <MetricCard label="Urgent" value={urgent} color="amber" />
        <MetricCard label="On track" value={onTrack} color="green" />
        <MetricCard label="Matched" value={deals.reduce((s, d) => s + (d.properties_matched || 0), 0)} />
        <MetricCard label="Meetings" value={meetings} />
        <MetricCard label="Pipeline" value={fmtShort(pipeline)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Active deals</h2>
              <button onClick={() => nav('deals')} style={{ fontSize: 11, color: primaryColor, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Client', 'Type', 'Value', 'Days', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {active.map(({ d, u }) => (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => onRowClick(d)}>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: C.text }}>{d.client_name}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: C.textMuted }}>{d.property_sold_type}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{fmtShort(d.sale_amount)}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: u.color === 'red' ? '#DC2626' : u.color === 'amber' ? '#D97706' : '#16A34A' }}>{u.daysLeft}d</td>
                    <td style={{ padding: '8px 12px' }}><Badge color={u.color}>{u.label}</Badge></td>
                    <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <IconBtn icon={Target} title="Match" onClick={() => onMatch(d)} />
                        <IconBtn icon={Mail} title="Outreach" onClick={() => onOutreach(d)} />
                        <IconBtn icon={Trash2} title="Delete" danger onClick={() => onDeleteDeal(d)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {active.length === 0 && <tr><td colSpan={6}><EmptyState icon={Briefcase} text="No active deals yet." /></td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Monthly deal volume</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={months6}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: C.border }} />
                <Bar dataKey="count" fill={primaryColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Recent activity</h2>
          {activity.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: primaryColor, marginTop: 5, flexShrink: 0 }} />
              <div><div style={{ color: C.text }}>{a.text}</div><div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{fmtDate(a.date)}</div></div>
            </div>
          ))}
          {activity.length === 0 && <EmptyState icon={Clock} text="No activity yet." />}
        </div>
      </div>
    </div>
  );
}

// ── Deals Page ──
function DealsPage({ deals, onRowClick, onMatch, onOutreach, onDelete, onNewDeal, onExport, primaryColor }) {
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const rows = useMemo(() => {
    let r = deals.map(d => ({ d, u: getDealUrgency(d) }));
    if (search) { const s = search.toLowerCase(); r = r.filter(({ d }) => d.client_name?.toLowerCase().includes(s) || d.client_email?.toLowerCase().includes(s) || d.property_sold_address?.toLowerCase().includes(s)); }
    if (statusF !== 'all') r = r.filter(({ u }) => u.key === statusF);
    return r.sort((a, b) => (a.u.daysLeft ?? 9999) - (b.u.daysLeft ?? 9999));
  }, [deals, search, statusF]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Deals</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => onExport('csv')}><Download size={13} /> CSV</Btn>
          <Btn variant="ghost" onClick={() => onExport('json')}><Download size={13} /> JSON</Btn>
          <Btn onClick={onNewDeal} style={{ background: primaryColor }}><Plus size={14} /> New deal</Btn>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, address..." style={{ padding: '7px 10px 7px 28px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', width: 240, fontFamily: 'inherit', color: C.text }} />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>
          <option value="all">All statuses</option><option value="critical">Critical</option><option value="urgent">Urgent</option><option value="on_track">On track</option><option value="closed">Closed</option>
        </select>
        <span style={{ fontSize: 12, color: C.textMuted, alignSelf: 'center', marginLeft: 'auto' }}>{rows.length} deals</span>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Client', 'Type', 'Value', 'Days left', 'Status', 'Matched', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({ d, u }) => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => onRowClick(d)}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.text }}>{d.client_name}<div style={{ fontSize: 11, color: C.textMuted }}>{d.client_email}</div></td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{d.property_sold_type}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{fmtMoney(d.sale_amount)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: u.color === 'red' ? '#DC2626' : u.color === 'amber' ? '#D97706' : u.color === 'green' ? '#16A34A' : C.textMuted }}>{u.daysLeft !== null ? `${u.daysLeft}d` : '—'}</td>
                <td style={{ padding: '10px 12px' }}><Badge color={u.color}>{u.label}</Badge></td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{d.properties_matched || 0}</td>
                <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <IconBtn icon={Target} title="Match" onClick={() => onMatch(d)} />
                    <IconBtn icon={Mail} title="Outreach" onClick={() => onOutreach(d)} />
                    <IconBtn icon={Trash2} title="Delete" danger onClick={() => onDelete(d)} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7}><EmptyState icon={Search} text="No deals found." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Properties Page ──
function PropertiesPage({ properties, onNew, onEdit, onDelete, onExport, primaryColor }) {
  const [typeF, setTypeF] = useState('all');
  const rows = useMemo(() => properties.filter(p => typeF === 'all' || p.property_type === typeF), [properties, typeF]);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Properties</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => onExport('csv')}><Download size={13} /> CSV</Btn>
          <Btn onClick={onNew} style={{ background: primaryColor }}><Plus size={14} /> Add property</Btn>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} style={{ padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>
          <option value="all">All types</option>{PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: C.textMuted, alignSelf: 'center', marginLeft: 'auto' }}>{rows.length} properties</span>
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Address', 'Type', 'Price', 'Cap rate', 'NOI', 'Broker', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.text }}>{p.address}<div style={{ fontSize: 11, color: C.textMuted }}>{p.city}, {p.state}</div></td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{p.property_type}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{fmtMoney(p.price)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{p.cap_rate}%</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{fmtMoney(p.noi)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{p.broker_name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <IconBtn icon={Pencil} onClick={() => onEdit(p)} />
                    <IconBtn icon={Trash2} danger onClick={() => onDelete(p)} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7}><EmptyState icon={Building2} text="No properties yet." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Outreach Page ──
function OutreachPage({ outreach, deals, onLogNew, onExport, primaryColor }) {
  const replied = outreach.filter(o => o.status === 'replied').length;
  const rate = outreach.length ? Math.round((replied / outreach.length) * 100) : 0;
  const dealName = id => deals.find(d => d.id === id)?.client_name || '—';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Outreach</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onExport}><Download size={13} /> Export</Btn>
          <Btn onClick={onLogNew} style={{ background: primaryColor }}><Plus size={14} /> Log outreach</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total sent" value={outreach.length} />
        <MetricCard label="Replied" value={replied} color="green" />
        <MetricCard label="No response" value={outreach.filter(o => o.status === 'no_response').length} color="amber" />
        <MetricCard label="Response rate" value={rate + '%'} color={rate > 30 ? 'green' : 'amber'} />
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Deal', 'Broker', 'Sent', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {outreach.slice().sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at)).map(o => (
              <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.text }}>{dealName(o.deal_id)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{o.broker_email}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{fmtDate(o.sent_at)}</td>
                <td style={{ padding: '10px 12px' }}><Badge color={o.status === 'replied' ? 'green' : o.status === 'sent' ? 'amber' : 'gray'}>{o.status?.replace('_', ' ')}</Badge></td>
              </tr>
            ))}
            {outreach.length === 0 && <tr><td colSpan={4}><EmptyState icon={Mail} text="No outreach logged yet." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bookings Page ──
function BookingsPage({ bookings, deals, onNew, onExport, primaryColor }) {
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const dealName = id => deals.find(d => d.id === id)?.client_name || '—';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Bookings</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onExport}><Download size={13} /> Export</Btn>
          <Btn onClick={onNew} style={{ background: primaryColor }}><Plus size={14} /> New booking</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total bookings" value={bookings.length} />
        <MetricCard label="Confirmed" value={confirmed} color="green" />
        <MetricCard label="This month" value={bookings.filter(b => new Date(b.created_at).getMonth() === new Date().getMonth()).length} />
      </div>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Client', 'Deal', 'Date', 'Type', 'Notes', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.text }}>{b.client_name}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{dealName(b.deal_id)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>{fmtDate(b.booking_date)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{b.meeting_type}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.textMuted }}>{b.notes}</td>
                <td style={{ padding: '10px 12px' }}><Badge color={b.status === 'confirmed' ? 'green' : 'amber'}>{b.status}</Badge></td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={6}><EmptyState icon={Calendar} text="No bookings yet." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports Page ──
function ReportsPage({ deals, outreach, bookings, onExportDeals, primaryColor }) {
  const closed = deals.filter(d => d.status === 'closed');
  const pipeline = deals.filter(d => d.status !== 'closed').reduce((s, d) => s + d.sale_amount, 0);
  const winRate = deals.length ? Math.round((closed.length / deals.length) * 100) : 0;
  const statusData = useMemo(() => {
    const g = { critical: 0, urgent: 0, on_track: 0, closed: 0 };
    deals.forEach(d => { g[getDealUrgency(d).key]++; });
    return [{ name: 'Critical', value: g.critical, color: '#DC2626' }, { name: 'Urgent', value: g.urgent, color: '#D97706' }, { name: 'On track', value: g.on_track, color: '#16A34A' }, { name: 'Closed', value: g.closed, color: '#A8A29E' }].filter(g => g.value > 0);
  }, [deals]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Reports</h1>
        <Btn variant="ghost" onClick={onExportDeals}><Download size={13} /> Export deals</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total deals" value={deals.length} />
        <MetricCard label="Closed" value={closed.length} color="green" />
        <MetricCard label="Win rate" value={winRate + '%'} color="green" />
        <MetricCard label="Pipeline" value={fmtShort(pipeline)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Deals by status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
              {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie><RTooltip contentStyle={{ fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Summary</h2>
          {[['Total pipeline', fmtMoney(pipeline)], ['Closed volume', fmtMoney(closed.reduce((s, d) => s + d.sale_amount, 0))], ['Total outreach', outreach.length], ['Response rate', outreach.length ? Math.round((outreach.filter(o => o.status === 'replied').length / outreach.length) * 100) + '%' : '0%'], ['Total bookings', bookings.length]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.textMuted }}>{l}</span><span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 500, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Deadlines Page ──
function DeadlinesPage({ deals, primaryColor }) {
  const rows = useMemo(() => deals.filter(d => d.status !== 'closed').map(d => ({ d, u: getDealUrgency(d) })).sort((a, b) => a.u.daysLeft - b.u.daysLeft), [deals]);
  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>Deadlines</h1>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace,monospace' }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Client', 'Property', 'Deadline', 'Date', 'Days left', 'Value'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', fontFamily: 'Inter,sans-serif' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({ d, u }) => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}`, background: u.color === 'red' ? '#FEF2F2' : u.color === 'amber' ? '#FFFBEB' : 'transparent' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'Inter,sans-serif', color: C.text }}>{d.client_name}</td>
                <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'Inter,sans-serif', color: C.textMuted }}>{d.property_sold_address}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.text }}>{u.deadlineLabel}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.text }}>{fmtDate(u.deadlineDate)}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: u.color === 'red' ? '#DC2626' : u.color === 'amber' ? '#D97706' : '#16A34A' }}>{u.daysLeft}d</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: C.text }}>{fmtMoney(d.sale_amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} style={{ fontFamily: 'Inter,sans-serif' }}><EmptyState icon={CalendarClock} text="No upcoming deadlines." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CSV Upload Page ──
function CSVUploadPage({ onImportDeals, onImportProperties, primaryColor }) {
  const [mode, setMode] = useState('deals');
  const [parsed, setParsed] = useState(null);
  const [drag, setDrag] = useState(false);
  const [summary, setSummary] = useState(null);
  const FIELDS = { deals: ['client_name', 'client_email', 'sale_date', 'sale_amount', 'property_type', 'property_address'], properties: ['address', 'city', 'state', 'price', 'cap_rate', 'property_type', 'broker_name', 'broker_email'] };
  const handleFile = file => { if (!file) return; Papa.parse(file, { header: true, skipEmptyLines: true, dynamicTyping: true, complete: res => { const headers = (res.meta.fields || []).map(h => h.trim()); const mapping = {}; headers.forEach(h => { const n = h.toLowerCase().replace(/[\s_-]/g, ''); const m = FIELDS[mode].find(f => f.toLowerCase().replace(/[\s_-]/g, '') === n); mapping[h] = m || null; }); setParsed({ headers, rows: res.data, mapping }); setSummary(null); } }); };
  const doImport = () => { let ok = 0, fail = 0; const items = parsed.rows.map(row => { const out = {}; parsed.headers.forEach(h => { if (parsed.mapping[h]) out[parsed.mapping[h]] = row[h]; }); return out; }).filter(it => { const v = mode === 'deals' ? (it.client_name && it.sale_amount) : (it.address && it.price); v ? ok++ : fail++; return v; }); if (mode === 'deals') onImportDeals(items); else onImportProperties(items); setSummary({ ok, fail }); setParsed(null); };
  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>CSV Upload</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Btn variant={mode === 'deals' ? 'primary' : 'ghost'} style={mode === 'deals' ? { background: primaryColor } : {}} onClick={() => { setMode('deals'); setParsed(null); setSummary(null); }}>Deals</Btn>
        <Btn variant={mode === 'properties' ? 'primary' : 'ghost'} style={mode === 'properties' ? { background: primaryColor } : {}} onClick={() => { setMode('properties'); setParsed(null); setSummary(null); }}>Properties</Btn>
      </div>
      {!parsed && (<div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }} style={{ border: `2px dashed ${drag ? primaryColor : C.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', background: drag ? '#F0FDF4' : '#fff' }}>
        <Upload size={28} style={{ marginBottom: 12, color: C.textMuted }} />
        <p style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>Drag & drop a {mode} CSV here</p>
        <label style={{ fontSize: 13, fontWeight: 500, color: primaryColor, cursor: 'pointer', textDecoration: 'underline' }}>or browse files<input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} /></label>
        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 12 }}>Expected: {FIELDS[mode].join(', ')}</p>
      </div>)}
      {parsed && (<div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Preview — {parsed.rows.length} rows</h3>
        <div style={{ overflowX: 'auto', marginBottom: 12, border: `1px solid ${C.border}`, borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{parsed.headers.map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: C.textMuted }}>{h}</th>)}</tr></thead>
            <tbody>{parsed.rows.slice(0, 3).map((r, i) => <tr key={i}>{parsed.headers.map(h => <td key={h} style={{ padding: '6px 8px', color: C.text }}>{String(r[h] ?? '')}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><Btn variant="ghost" onClick={() => setParsed(null)}>Cancel</Btn><Btn onClick={doImport} style={{ background: primaryColor }}><Upload size={13} /> Import {parsed.rows.length} rows</Btn></div>
      </div>)}
      {summary && (<div style={{ marginTop: 16, background: '#F0FDF4', border: `1px solid #BBF7D0`, borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle2 size={16} style={{ color: '#15803D' }} /><p style={{ fontSize: 13, color: '#15803D' }}>Imported {summary.ok} rows{summary.fail > 0 ? `, skipped ${summary.fail}` : ''}</p>
      </div>)}
    </div>
  );
}

// ── Insights Page ──
function InsightsPage({ deals, outreach, settings, primaryColor }) {
  const timeSaved = deals.reduce((s, d) => s + (d.properties_matched || 0) * 2, 0) + outreach.length * 0.5 + deals.length;
  const moneySaved = timeSaved * (settings.hourly_rate || 150);
  const closed = deals.filter(d => d.status === 'closed');
  const closedVol = closed.reduce((s, d) => s + d.sale_amount, 0);
  const feeRev = closedVol * ((settings.fee_percent || 1) / 100);
  const net = moneySaved + feeRev - (settings.subscription_cost || 297);
  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 4 }}>Insights</h1>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Your ROI from using WealthBuilder 1031.</p>
      <div style={{ background: '#fff', border: `2px solid ${primaryColor}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Net value generated</div>
        <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 28, fontWeight: 700, color: primaryColor }}>{fmtMoney(net)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <MetricCard label="Time saved" value={Math.round(timeSaved) + ' hrs'} sub="vs manual tracking" />
        <MetricCard label="Money saved" value={fmtShort(moneySaved)} sub={`@ $${settings.hourly_rate || 150}/hr`} />
        <MetricCard label="Fee revenue" value={fmtShort(feeRev)} sub={`${settings.fee_percent || 1}% on closed`} />
      </div>
    </div>
  );
}

// ── Settings Page ──
function SettingsPage({ tenant, setTenant, settings, setSettings, plan, onToast, onConfirm, primaryColor }) {
  const [form, setForm] = useState({ ...tenant });
  const [sForm, setSForm] = useState({ ...settings });
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealKey, setRevealKey] = useState(null);
  const [testingWH, setTestingWH] = useState(false);

  useEffect(() => {
    supabase.from('wb_api_keys').select('*').eq('tenant_id', tenant?.id).order('created_at', { ascending: false }).then(({ data }) => setApiKeys(data || []));
  }, [tenant?.id]);

  const saveTenant = async () => {
    const { error } = await supabase.from('wb_tenants').update({ company_name: form.company_name, owner_name: form.owner_name, logo_url: plan.custom_logo ? form.logo_url : tenant.logo_url, primary_color: plan.custom_color ? form.primary_color : tenant.primary_color }).eq('id', tenant.id);
    if (error) { onToast(error.message, 'error'); return; }
    setTenant({ ...tenant, ...form });
    onToast('Settings saved');
  };

  const saveSettings = async () => {
    await supabase.from('wb_settings').upsert({ ...sForm, tenant_id: tenant?.id }).eq('tenant_id', tenant?.id);
    setSettings(sForm);
    onToast('Settings saved');
  };

  const genKey = async () => {
    if (!newKeyName.trim()) return;
    const raw = 'wb_live_' + Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    const { data } = await supabase.from('wb_api_keys').insert({ name: newKeyName, key_hash: btoa(raw), last4: raw.slice(-4), tenant_id: tenant?.id }).select().single();
    if (data) { setApiKeys(k => [data, ...k]); setRevealKey(raw); setNewKeyName(''); onToast('API key created'); }
  };

  const revokeKey = async (id) => {
    await supabase.from('wb_api_keys').update({ revoked: true }).eq('id', id);
    setApiKeys(k => k.map(x => x.id === id ? { ...x, revoked: true } : x));
    onToast('Key revoked', 'error');
  };

  const testWebhook = async () => {
    if (!sForm.webhook_outgoing) { onToast('Add outgoing webhook URL first', 'error'); return; }
    setTestingWH(true);
    try { await fetch(sForm.webhook_outgoing, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test', source: 'WealthBuilder1031', tenant_id: tenant?.id }) }); onToast('Test sent'); } catch { onToast('Webhook failed', 'error'); }
    setTestingWH(false);
  };

  const incomingURL = `https://n8n.diptyai.com/webhook/1031-deal-intake`;

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>Settings</h1>

      {/* Plan info */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Current plan: <Badge color={tenant?.plan === 'enterprise' ? 'purple' : tenant?.plan === 'pro' ? 'blue' : 'gray'}>{(tenant?.plan || 'basic').toUpperCase()}</Badge></div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>${plan.price}/month · {tenant?.client_limit === 999999 ? 'Unlimited' : tenant?.client_limit} clients · {plan.white_label ? 'White label ✓' : 'No white label'}</div>
          </div>
          {tenant?.plan !== 'enterprise' && <Btn variant="blue" size="sm"><TrendingUp size={13} /> Upgrade plan</Btn>}
        </div>
      </div>

      <Section title="Company branding" subtitle={plan.custom_logo ? 'Customize your company name, logo, and colors.' : 'Upgrade to Pro to customize logo and colors.'}>
        <Field label="Company name"><input value={form.company_name || ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
        {plan.custom_logo && <Field label="Logo URL"><input value={form.logo_url || ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://yourdomain.com/logo.png" style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>}
        {plan.custom_color && (
          <Field label="Brand color">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.primary_color || '#16A34A'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 40, height: 36, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', padding: 2 }} />
              <input value={form.primary_color || '#16A34A'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 120, padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text }} />
              <div style={{ width: 36, height: 36, borderRadius: 6, background: form.primary_color || '#16A34A' }} />
            </div>
          </Field>
        )}
        <Btn size="sm" onClick={saveTenant} style={{ background: primaryColor }}>Save branding</Btn>
      </Section>

      <Section title="Insights configuration">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Hourly rate ($)"><input type="number" value={sForm.hourly_rate || 150} onChange={e => setSForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
          <Field label="QI fee %"><input type="number" step="0.1" value={sForm.fee_percent || 1} onChange={e => setSForm(f => ({ ...f, fee_percent: Number(e.target.value) }))} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
          <Field label="Sub cost/mo ($)"><input type="number" value={sForm.subscription_cost || plan.price} onChange={e => setSForm(f => ({ ...f, subscription_cost: Number(e.target.value) }))} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
        </div>
        <Btn size="sm" onClick={saveSettings} style={{ background: primaryColor }}>Save</Btn>
      </Section>

      {plan.api_access && (
        <Section title="API Keys" subtitle="Connect GoHighLevel, HubSpot, or any CRM.">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. GoHighLevel)" style={{ flex: 1, padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text }} />
            <Btn onClick={genKey} style={{ background: primaryColor }}><KeyRound size={13} /> Generate</Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiKeys.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px' }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text }}>{k.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'ui-monospace,monospace', color: C.textMuted }}>wb_live_••••{k.last4} · {fmtDate(k.created_at)}</div>
                </div>
                {k.revoked ? <Badge color="red">Revoked</Badge> : <Btn size="sm" variant="ghost" onClick={() => onConfirm({ title: 'Revoke key?', message: `"${k.name}" will stop working.`, danger: true, confirmLabel: 'Revoke', onConfirm: () => revokeKey(k.id) })}>Revoke</Btn>}
              </div>
            ))}
            {apiKeys.length === 0 && <p style={{ fontSize: 12, color: C.textMuted }}>No API keys yet.</p>}
          </div>
        </Section>
      )}

      <Section title="Webhooks" subtitle="Connect to any CRM via REST webhooks.">
        <Field label="Incoming webhook URL" hint="POST deals here from any CRM. Header: x-api-key: wb_live_...">
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={incomingURL} readOnly style={{ flex: 1, padding: '7px 10px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bgAlt, fontFamily: 'ui-monospace,monospace', color: C.text }} />
            <Btn size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(incomingURL); onToast('Copied'); }}><Copy size={13} /></Btn>
          </div>
        </Field>
        <Field label="Outgoing webhook URL" hint="We POST events here: deal.created · property.matched · outreach.sent · deal.updated">
          <input value={sForm.webhook_outgoing || ''} onChange={e => setSForm(f => ({ ...f, webhook_outgoing: e.target.value }))} placeholder="https://your-crm.com/webhooks/wb1031" style={{ width: '100%', padding: '7px 10px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" onClick={saveSettings} style={{ background: primaryColor }}>Save</Btn>
          <Btn size="sm" variant="ghost" onClick={testWebhook} disabled={testingWH}>{testingWH ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Webhook size={13} />} Test webhook</Btn>
        </div>
      </Section>

      {revealKey && (
        <Modal title="API key created" onClose={() => setRevealKey(null)} width="460px">
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Copy this key now — you won't see it again.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={revealKey} readOnly style={{ flex: 1, padding: '7px 10px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'ui-monospace,monospace', color: C.text }} />
            <Btn size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(revealKey); onToast('Copied'); }}><Copy size={13} /></Btn>
          </div>
          <Btn onClick={() => setRevealKey(null)} style={{ background: primaryColor }}>Done</Btn>
        </Modal>
      )}
    </div>
  );
}

// ── Modals ──
function DealDrawer({ deal, properties, outreach, onClose, onSave, primaryColor }) {
  const [form, setForm] = useState({ ...deal });
  const u = getDealUrgency(deal);
  const matched = properties.filter(p => p.property_type === deal.property_sold_type);
  const linked = outreach.filter(o => o.deal_id === deal.id);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(55,53,47,0.45)' }} onClick={onClose}>
      <div style={{ background: '#fff', height: '100%', overflowY: 'auto', borderLeft: `1px solid ${C.border}`, width: 440, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{deal.client_name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><Badge color={u.color}>{u.label}</Badge>{u.daysLeft !== null && <span style={{ fontSize: 11, color: C.textMuted }}>{u.daysLeft}d to {u.deadlineLabel}</span>}</div>
          <Field label="Client name"><input value={form.client_name || ''} onChange={set('client_name')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
          <Field label="Email"><input value={form.client_email || ''} onChange={set('client_email')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
          <Field label="Sale amount"><input type="number" value={form.sale_amount || ''} onChange={e => setForm(f => ({ ...f, sale_amount: Number(e.target.value) }))} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
          <Field label="Status"><select value={form.status || 'active'} onChange={set('status')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}><option value="active">Active</option><option value="closed">Closed</option></select></Field>
          <Btn onClick={() => onSave(deal.id, form)} style={{ background: primaryColor, marginBottom: 20 }}>Save changes</Btn>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: C.textMuted, marginBottom: 6 }}>Deadlines</div>
            <div style={{ fontSize: 12, fontFamily: 'ui-monospace,monospace', color: C.text }}>45-day: {fmtDate(deal.deadline_45)} · 180-day: {fmtDate(deal.deadline_180)}</div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Matched properties</div>
            {matched.slice(0, 3).map(p => <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', marginBottom: 6, fontSize: 12, color: C.text }}>{p.address}, {p.city} {p.state} — {fmtMoney(p.price)}</div>)}
            {matched.length === 0 && <p style={{ fontSize: 12, color: C.textMuted }}>No matching properties.</p>}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Outreach log</div>
            {linked.map(o => <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}><span style={{ fontSize: 12, color: C.text }}>{o.broker_email}</span><Badge color={o.status === 'replied' ? 'green' : 'amber'}>{o.status}</Badge></div>)}
            {linked.length === 0 && <p style={{ fontSize: 12, color: C.textMuted }}>No outreach yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewDealModal({ onClose, onCreate, primaryColor }) {
  const [f, setF] = useState({ client_name: '', client_email: '', client_phone: '', sale_date: new Date().toISOString().slice(0, 10), sale_amount: '', property_type: 'Retail', property_address: '' });
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  return (
    <Modal title="New deal" onClose={onClose}>
      <Field label="Client name"><input value={f.client_name} onChange={set('client_name')} placeholder="Jane Doe" style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Email"><input value={f.client_email} onChange={set('client_email')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
        <Field label="Phone"><input value={f.client_phone} onChange={set('client_phone')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Sale date"><input type="date" value={f.sale_date} onChange={set('sale_date')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
        <Field label="Sale amount"><input type="number" value={f.sale_amount} onChange={set('sale_amount')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
      </div>
      <Field label="Property type"><select value={f.property_type} onChange={set('property_type')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>{PROP_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Property address" hint="45 and 180-day deadlines auto-calculate."><input value={f.property_address} onChange={set('property_address')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!f.client_name || !f.sale_amount} onClick={() => onCreate({ ...f, sale_amount: Number(f.sale_amount) })} style={{ background: primaryColor }}>Create deal</Btn>
      </div>
    </Modal>
  );
}

function MatchModal({ deal, properties, onClose, onMatch, loading, primaryColor }) {
  const list = properties.filter(p => p.property_type === deal.property_sold_type);
  return (
    <Modal title={`Match — ${deal.client_name}`} onClose={onClose} width="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
        {list.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px' }}>
            <div><div style={{ fontSize: 13, color: C.text }}>{p.address}, {p.city} {p.state}</div><div style={{ fontSize: 11, fontFamily: 'ui-monospace,monospace', color: C.textMuted }}>{fmtMoney(p.price)} · {p.cap_rate}% cap · {p.broker_name}</div></div>
            <Btn size="sm" disabled={loading} onClick={() => onMatch(deal, p)} style={{ background: primaryColor }}>Mark matched</Btn>
          </div>
        ))}
        {list.length === 0 && <EmptyState icon={Building2} text="No matching properties." />}
      </div>
    </Modal>
  );
}

function OutreachModal({ deal, properties, onClose, onSend, loading }) {
  const list = properties.filter(p => p.property_type === deal.property_sold_type);
  const [propId, setPropId] = useState(list[0]?.id || '');
  const selected = properties.find(p => p.id === propId);
  return (
    <Modal title={`Outreach — ${deal.client_name}`} onClose={onClose}>
      <Field label="Property"><select value={propId} onChange={e => setPropId(e.target.value)} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>{list.map(p => <option key={p.id} value={p.id}>{p.address}, {p.city}</option>)}</select></Field>
      {selected && <Field label="Broker email"><input value={selected.broker_email} readOnly style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bgAlt, color: C.text, boxSizing: 'border-box' }} /></Field>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!selected || loading} onClick={() => onSend(deal, selected)}><Send size={13} /> {loading ? 'Sending...' : 'Send outreach'}</Btn>
      </div>
    </Modal>
  );
}

function LogOutreachModal({ deals, properties, onClose, onSend }) {
  const [dealId, setDealId] = useState(deals.filter(d => d.status !== 'closed')[0]?.id || '');
  const deal = deals.find(d => d.id === dealId);
  const list = deal ? properties.filter(p => p.property_type === deal.property_sold_type) : [];
  const [propId, setPropId] = useState(list[0]?.id || '');
  const selected = properties.find(p => p.id === propId);
  return (
    <Modal title="Log outreach" onClose={onClose}>
      <Field label="Deal"><select value={dealId} onChange={e => { setDealId(e.target.value); setPropId(''); }} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>{deals.filter(d => d.status !== 'closed').map(d => <option key={d.id} value={d.id}>{d.client_name}</option>)}</select></Field>
      <Field label="Property"><select value={propId} onChange={e => setPropId(e.target.value)} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}><option value="">Select property</option>{list.map(p => <option key={p.id} value={p.id}>{p.address}, {p.city}</option>)}</select></Field>
      {selected && <Field label="Broker"><input value={selected.broker_email} readOnly style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bgAlt, color: C.text, boxSizing: 'border-box' }} /></Field>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!deal || !selected} onClick={() => onSend(deal, selected)}><Send size={13} /> Send</Btn>
      </div>
    </Modal>
  );
}

function PropertyModal({ mode, data, onClose, onSave }) {
  const [f, setF] = useState(data || { address: '', city: '', state: '', price: '', cap_rate: '', property_type: 'Retail', broker_name: '', broker_email: '', broker_phone: '' });
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const noi = Math.round((Number(f.price) || 0) * ((Number(f.cap_rate) || 0) / 100));
  return (
    <Modal title={mode === 'edit' ? 'Edit property' : 'Add property'} onClose={onClose} width="520px">
      <Field label="Address"><input value={f.address} onChange={set('address')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="City"><input value={f.city} onChange={set('city')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
        <Field label="State"><input value={f.state} onChange={set('state')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Price"><input type="number" value={f.price} onChange={set('price')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
        <Field label="Cap rate %"><input type="number" step="0.1" value={f.cap_rate} onChange={set('cap_rate')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
      </div>
      <Field label="Property type"><select value={f.property_type} onChange={set('property_type')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>{PROP_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
      <Field label="NOI (auto)"><input value={fmtMoney(noi)} readOnly style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bgAlt, fontFamily: 'ui-monospace,monospace', color: C.text, boxSizing: 'border-box' }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Broker name"><input value={f.broker_name} onChange={set('broker_name')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
        <Field label="Broker phone"><input value={f.broker_phone} onChange={set('broker_phone')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      </div>
      <Field label="Broker email"><input value={f.broker_email} onChange={set('broker_email')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave({ ...f, price: Number(f.price), cap_rate: Number(f.cap_rate), noi })}>{mode === 'edit' ? 'Save changes' : 'Add property'}</Btn>
      </div>
    </Modal>
  );
}

function NewBookingModal({ deals, onClose, onCreate }) {
  const [f, setF] = useState({ client_name: '', client_email: '', deal_id: deals[0]?.id || '', booking_date: new Date().toISOString().slice(0, 10), meeting_type: 'Consultation', notes: '' });
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  return (
    <Modal title="New booking" onClose={onClose}>
      <Field label="Client name"><input value={f.client_name} onChange={set('client_name')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      <Field label="Client email"><input value={f.client_email} onChange={set('client_email')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
      <Field label="Deal"><select value={f.deal_id} onChange={set('deal_id')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>{deals.map(d => <option key={d.id} value={d.id}>{d.client_name}</option>)}</select></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Date"><input type="date" value={f.booking_date} onChange={set('booking_date')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, boxSizing: 'border-box' }} /></Field>
        <Field label="Meeting type"><select value={f.meeting_type} onChange={set('meeting_type')} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, background: '#fff' }}>
          {['Consultation', 'Property review', 'Closing prep', 'Follow-up', 'Other'].map(t => <option key={t}>{t}</option>)}
        </select></Field>
      </div>
      <Field label="Notes"><textarea value={f.notes} onChange={set('notes')} rows={3} style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, resize: 'vertical', boxSizing: 'border-box' }} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!f.client_name || !f.booking_date} onClick={() => onCreate(f)}>Create booking</Btn>
      </div>
    </Modal>
  );
}
