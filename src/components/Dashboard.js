import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import CasioClock from './CasioClock';
import NewDealModal from './NewDealModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const N8N_BASE = 'https://n8n.diptyai.com/webhook';

const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

const colors = ['#00e676','#2979ff','#ff6d00','#e040fb','#ffea00','#00b0ff','#69f0ae','#ff4081'];
const avatarBg = (name) => {
  const i = (name || '').charCodeAt(0) % colors.length;
  return colors[i];
};

const daysLeft = (deadline) => {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

const fmt = (n) => {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
};

export default function Dashboard({ user, onSignOut }) {
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('ex_deals').select('*').order('created_at', { ascending: false }),
      supabase.from('ex_properties').select('*').limit(5)
    ]);
    setDeals(d || []);
    setProperties(p || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runAction = async (deal, action) => {
    const key = `${deal.id}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const endpoint = action === 'match'
        ? `${N8N_BASE}/1031-property-match`
        : `${N8N_BASE}/1031-broker-outreach`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          target_state: 'TX',
          target_property_type: deal.property_sold_type || 'retail',
          max_budget: deal.sale_amount,
          client_name: deal.client_name,
          client_email: deal.client_email
        })
      });
      if (res.ok) {
        showToast(action === 'match' ? `Property report sent to ${deal.client_name}!` : `Broker outreach started for ${deal.client_name}!`);
        fetchData();
      } else {
        showToast('Action failed. Check n8n.', 'error');
      }
    } catch {
      showToast('Network error. Check n8n connection.', 'error');
    }
    setActionLoading(prev => ({ ...prev, [key]: false }));
  };

  const deleteDeal = async (id) => {
    setDeleting(id);
    await supabase.from('ex_broker_outreach').delete().eq('deal_id', id);
    await supabase.from('ex_property_matches').delete().eq('deal_id', id);
    await supabase.from('ex_deals').delete().eq('id', id);
    setDeals(prev => prev.filter(d => d.id !== id));
    showToast('Deal deleted.');
    setDeleting(null);
  };

  const filteredDeals = deals.filter(d => {
    const days = daysLeft(d.deadline_45);
    const matchSearch = !search || d.client_name?.toLowerCase().includes(search.toLowerCase()) || d.client_email?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'urgent') return matchSearch && days !== null && days <= 14;
    if (filter === 'active') return matchSearch && d.status === 'active';
    if (filter === 'closed') return matchSearch && d.status === 'closed';
    return matchSearch;
  });

  const urgent = deals.filter(d => { const dl = daysLeft(d.deadline_45); return dl !== null && dl <= 14; }).length;
  const totalVol = deals.reduce((a, b) => a + (b.sale_amount || 0), 0);
  const totalMatched = deals.reduce((a, b) => a + (b.properties_matched || 0), 0);

  const chartData = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => ({
    month: m,
    volume: i < 6 ? Math.floor(Math.random() * 8 + 2) * 1000000 : 0
  }));

  const s = {
    wrap: { display:'flex', height:'100vh', overflow:'hidden', background:'#080808', color:'#e0e0e0', fontFamily:"'Inter', sans-serif" },
    sidebar: { width:220, background:'#0d0d0d', borderRight:'1px solid #1a1a1a', display:'flex', flexDirection:'column', padding:'20px 12px', flexShrink:0 },
    logo: { display:'flex', alignItems:'center', gap:10, padding:'0 8px 20px', borderBottom:'1px solid #1a1a1a', marginBottom:16 },
    logoIcon: { width:34, height:34, background:'#00e676', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
    logoText: { fontSize:13, fontWeight:600, color:'#fff' },
    logoSub: { fontSize:10, color:'#555' },
    navSection: { fontSize:9, fontWeight:600, color:'#444', letterSpacing:'0.12em', textTransform:'uppercase', padding:'12px 8px 4px' },
    navItem: (active) => ({
      display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8,
      fontSize:13, color: active ? '#00e676' : '#666', cursor:'pointer',
      background: active ? 'rgba(0,230,118,0.08)' : 'transparent',
      borderLeft: active ? '2px solid #00e676' : '2px solid transparent',
      transition:'all 0.15s', marginBottom:2
    }),
    main: { flex:1, overflow:'auto', padding:'24px 28px' },
    topbar: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 },
    title: { fontSize:22, fontWeight:600, color:'#fff' },
    subtitle: { fontSize:12, color:'#555', marginTop:3 },
    searchBox: { display:'flex', alignItems:'center', gap:8, background:'#111', border:'1px solid #222', borderRadius:10, padding:'7px 14px', width:220 },
    searchInput: { background:'none', border:'none', outline:'none', color:'#e0e0e0', fontSize:13, width:'100%', fontFamily:'Inter,sans-serif' },
    btnNew: { display:'flex', alignItems:'center', gap:6, padding:'8px 18px', background:'#00e676', color:'#000', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' },
    metrics: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 },
    metricCard: { background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:12, padding:'16px 18px' },
    metricLabel: { fontSize:11, color:'#555', marginBottom:6, display:'flex', alignItems:'center', gap:6 },
    metricValue: { fontSize:28, fontWeight:600, color:'#fff' },
    metricSub: { fontSize:11, color:'#444', marginTop:4 },
    grid: { display:'grid', gridTemplateColumns:'1fr 300px', gap:16, marginBottom:16 },
    card: { background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:12, padding:'18px 20px' },
    cardHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
    cardTitle: { fontSize:13, fontWeight:600, color:'#fff' },
    tabs: { display:'flex', gap:4 },
    tab: (active) => ({ fontSize:11, padding:'4px 10px', borderRadius:20, cursor:'pointer', border: active ? 'none' : '1px solid #222', background: active ? '#00e676' : 'transparent', color: active ? '#000' : '#555', fontWeight: active ? 600 : 400 }),
    dealRow: { display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #141414' },
    avatar: (name) => ({ width:36, height:36, borderRadius:'50%', background: avatarBg(name) + '22', border:`1px solid ${avatarBg(name)}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color: avatarBg(name), flexShrink:0 }),
    badge: (type) => {
      const map = { urgent:{bg:'#2a0808',color:'#ff5252'}, active:{bg:'#0a1f0a',color:'#00e676'}, pending:{bg:'#1f1500',color:'#ff9800'}, closed:{bg:'#111',color:'#555'} };
      const c = map[type] || map.active;
      return { display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:c.bg, color:c.color, marginLeft:6 };
    },
    actionBtn: (type) => {
      const map = { match:{bg:'#0a1428',color:'#2979ff',border:'#1a2a4a'}, outreach:{bg:'#0a1f0a',color:'#00e676',border:'#1a3a1a'}, del:{bg:'#1a0808',color:'#ff5252',border:'#3a1414'} };
      const c = map[type];
      return { padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:500, border:`1px solid ${c.border}`, color:c.color, background:c.bg, cursor:'pointer', display:'flex', alignItems:'center', gap:4 };
    },
    propRow: { display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #141414' },
    propIcon: { width:34, height:34, borderRadius:8, background:'#0a1f0a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 },
  };

  const navItems = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'deals', icon:'📁', label:'Deals' },
    { id:'properties', icon:'🏢', label:'Properties' },
    { id:'outreach', icon:'📧', label:'Outreach' },
    { id:'reports', icon:'📈', label:'Reports' },
    { id:'deadlines', icon:'📅', label:'Deadlines' },
    { id:'upload', icon:'⬆️', label:'CSV Upload' },
    { id:'settings', icon:'⚙️', label:'Settings' },
  ];

  return (
    <div style={s.wrap}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background: toast.type==='error' ? '#2a0808' : '#0a1f0a', border:`1px solid ${toast.type==='error' ? '#5a1a1a' : '#1a3a1a'}`, borderRadius:10, padding:'12px 18px', color: toast.type==='error' ? '#ff5252' : '#00e676', fontSize:13, fontWeight:500, maxWidth:320 }}>
          {toast.type === 'error' ? '✗ ' : '✓ '}{toast.msg}
        </div>
      )}

      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoIcon}>🏛</div>
          <div><div style={s.logoText}>WealthBuilder</div><div style={s.logoSub}>1031 Exchange</div></div>
        </div>

        <CasioClock />

        <div style={{ marginTop:16 }}>
          <div style={s.navSection}>Main</div>
          {navItems.slice(0,4).map(n => (
            <div key={n.id} style={s.navItem(activeNav===n.id)} onClick={() => setActiveNav(n.id)}>
              <span style={{fontSize:14}}>{n.icon}</span> {n.label}
            </div>
          ))}
          <div style={s.navSection}>Analytics</div>
          {navItems.slice(4,6).map(n => (
            <div key={n.id} style={s.navItem(activeNav===n.id)} onClick={() => setActiveNav(n.id)}>
              <span style={{fontSize:14}}>{n.icon}</span> {n.label}
            </div>
          ))}
          <div style={s.navSection}>System</div>
          {navItems.slice(6).map(n => (
            <div key={n.id} style={s.navItem(activeNav===n.id)} onClick={() => setActiveNav(n.id)}>
              <span style={{fontSize:14}}>{n.icon}</span> {n.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop:'auto', borderTop:'1px solid #1a1a1a', paddingTop:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 4px' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'#00e67622', border:'1px solid #00e67644', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#00e676' }}>
              {initials(user?.email || 'HI')}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#ccc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
              <div style={{ fontSize:10, color:'#444' }}>Admin</div>
            </div>
            <button onClick={onSignOut} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:16, padding:2 }} title="Sign out">⏻</button>
          </div>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.title}>Active exchanges</div>
            <div style={s.subtitle}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} — {deals.length} deals in progress</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={s.searchBox}>
              <span style={{fontSize:14,color:'#444'}}>🔍</span>
              <input style={s.searchInput} placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button style={s.btnNew} onClick={() => setShowModal(true)}>+ New deal</button>
          </div>
        </div>

        <div style={s.metrics}>
          {[
            { label:'Active deals', value: deals.length, sub:`${deals.filter(d=>d.status==='active').length} active`, color:'#fff', icon:'📁' },
            { label:'Urgent (≤14 days)', value: urgent, sub:'Immediate action needed', color: urgent > 0 ? '#ff5252' : '#00e676', icon:'⚠️' },
            { label:'Properties matched', value: totalMatched, sub:'Across all deals', color:'#00e676', icon:'🏢' },
            { label:'Total volume', value: fmt(totalVol), sub:'Under management', color:'#2979ff', icon:'💰' },
          ].map((m, i) => (
            <div key={i} style={s.metricCard}>
              <div style={s.metricLabel}><span>{m.icon}</span>{m.label}</div>
              <div style={{...s.metricValue, color:m.color}}>{m.value}</div>
              <div style={s.metricSub}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}>Deal pipeline</div>
              <div style={s.tabs}>
                {['all','urgent','active','closed'].map(f => (
                  <div key={f} style={s.tab(filter===f)} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</div>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{color:'#444',fontSize:13,padding:'20px 0',textAlign:'center'}}>Loading deals...</div>
            ) : filteredDeals.length === 0 ? (
              <div style={{color:'#444',fontSize:13,padding:'20px 0',textAlign:'center'}}>No deals found</div>
            ) : filteredDeals.map(deal => {
              const days = daysLeft(deal.deadline_45);
              const isUrgent = days !== null && days <= 14;
              const status = isUrgent ? 'urgent' : (deal.status || 'active');
              const progress = days !== null ? Math.max(0, Math.min(100, ((45 - days) / 45) * 100)) : 50;
              const matchKey = `${deal.id}-match`;
              const outreachKey = `${deal.id}-outreach`;

              return (
                <div key={deal.id} style={s.dealRow}>
                  <div style={s.avatar(deal.client_name)}>{initials(deal.client_name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:'#fff',display:'flex',alignItems:'center',gap:4}}>
                      {deal.client_name}
                      <span style={s.badge(status)}>{status}</span>
                      {days !== null && <span style={{fontSize:11,color: isUrgent?'#ff5252':'#555',marginLeft:4}}>{days}d left</span>}
                    </div>
                    <div style={{fontSize:11,color:'#555',marginTop:2}}>
                      {deal.property_sold_type || 'retail'} · {deal.client_email}
                    </div>
                    <div style={{height:3,background:'#1a1a1a',borderRadius:2,marginTop:6,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${progress}%`,background: isUrgent?'#ff5252':'#00e676',borderRadius:2,transition:'width 0.3s'}} />
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#fff'}}>{fmt(deal.sale_amount)}</div>
                    <div style={{fontSize:11,color:'#444',marginTop:2}}>{deal.deadline_45}</div>
                  </div>
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    <button style={s.actionBtn('match')} onClick={() => runAction(deal,'match')} disabled={actionLoading[matchKey]}>
                      {actionLoading[matchKey] ? '...' : '🔍 Match'}
                    </button>
                    <button style={s.actionBtn('outreach')} onClick={() => runAction(deal,'outreach')} disabled={actionLoading[outreachKey]}>
                      {actionLoading[outreachKey] ? '...' : '📧 Outreach'}
                    </button>
                    <button style={s.actionBtn('del')} onClick={() => deleteDeal(deal.id)} disabled={deleting===deal.id}>
                      {deleting===deal.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={s.card}>
              <div style={s.cardHeader}><div style={s.cardTitle}>Deadline tracker</div></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                {[
                  {label:'Critical',val:deals.filter(d=>{const dl=daysLeft(d.deadline_45);return dl!==null&&dl<=7;}).length,color:'#ff5252'},
                  {label:'Urgent',val:urgent,color:'#ff9800'},
                  {label:'On track',val:deals.filter(d=>{const dl=daysLeft(d.deadline_45);return dl===null||dl>14;}).length,color:'#00e676'},
                ].map((s2,i)=>(
                  <div key={i} style={{background:'#111',borderRadius:8,padding:'10px',textAlign:'center'}}>
                    <div style={{fontSize:22,fontWeight:600,color:s2.color}}>{s2.val}</div>
                    <div style={{fontSize:10,color:'#555',marginTop:2}}>{s2.label}</div>
                  </div>
                ))}
              </div>
              {deals.filter(d=>daysLeft(d.deadline_45)!==null&&daysLeft(d.deadline_45)<=30).slice(0,3).map(d=>(
                <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #141414'}}>
                  <div style={{fontSize:12,color:'#888'}}>{d.client_name}</div>
                  <div style={{fontSize:12,fontWeight:600,color:daysLeft(d.deadline_45)<=7?'#ff5252':daysLeft(d.deadline_45)<=14?'#ff9800':'#00e676'}}>{daysLeft(d.deadline_45)}d</div>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}><div style={s.cardTitle}>Properties in DB</div></div>
              {properties.map((p,i) => (
                <div key={i} style={s.propRow}>
                  <div style={s.propIcon}>🏬</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:'#ddd',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.property_name}</div>
                    <div style={{fontSize:11,color:'#555'}}>{p.city}, {p.state}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{fmt(p.price)}</div>
                    <div style={{fontSize:11,color:'#00e676'}}>{p.cap_rate}% cap</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>Monthly deal volume</div>
            <div style={{fontSize:11,color:'#444'}}>2026</div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <XAxis dataKey="month" tick={{fontSize:10,fill:'#444'}} axisLine={false} tickLine={false} />
              <YAxis tick={false} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{background:'#111',border:'1px solid #222',borderRadius:8,fontSize:12}} />
              <Bar dataKey="volume" fill="#00e676" radius={[3,3,0,0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showModal && <NewDealModal onClose={() => setShowModal(false)} onAdded={fetchData} />}
    </div>
  );
}
