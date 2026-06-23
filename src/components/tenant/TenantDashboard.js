import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';

const NAV = ['Dashboard','Deals','Properties','Outreach','Reports','Bookings','Settings'];
const ICONS = {'Dashboard':'📊','Deals':'💼','Properties':'🏢','Outreach':'📧','Reports':'📊','Bookings':'📅','Settings':'⚙️'};

export default function TenantDashboard({ session, tenant: initialTenant }) {
  const [tenant, setTenant] = useState(initialTenant);
  const [tab, setTab] = useState('Dashboard');
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [newDeal, setNewDeal] = useState({ client_name:'', client_email:'', client_phone:'', sale_amount:'', sale_date:'', property_type:'Retail', property_address:'' });
  const [newBooking, setNewBooking] = useState({ client_name:'', client_email:'', booking_date:'', meeting_type:'Consultation', notes:'' });
  const [settings, setSettings] = useState({ hourly_rate: 150, fee_percent: 1, subscription_cost: 500, webhook_outgoing: '', notif_email_deadlines: true });
  const [apiKeys, setApiKeys] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [d, p, o, b, s, k, r] = await Promise.all([
      supabase.from('ex_deals').select('*').order('created_at', { ascending: false }),
      supabase.from('ex_properties').select('*').limit(20),
      supabase.from('ex_broker_outreach').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('wb_bookings').select('*').order('booking_date', { ascending: false }),
      supabase.from('wb_settings').select('*').limit(1),
      supabase.from('wb_api_keys').select('*').eq('revoked', false),
      supabase.from('ex_match_reports').select('id,client_name,created_at,html_report').order('created_at', { ascending: false }),
    ]);
    setDeals(d.data || []);
    setProperties(p.data || []);
    setOutreach(o.data || []);
    setBookings(b.data || []);
    if (s.data?.[0]) setSettings(prev => ({ ...prev, ...s.data[0] }));
    setApiKeys(k.data || []);
    setReports(r.data || []);
    setReports(rep.data || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function addDeal(e) {
    e.preventDefault();
    const { error } = await supabase.from('ex_deals').insert({
      client_name: newDeal.client_name, client_email: newDeal.client_email,
      client_phone: newDeal.client_phone, sale_amount: parseFloat(newDeal.sale_amount),
      sale_date: newDeal.sale_date, property_type: newDeal.property_type,
      property_address: newDeal.property_address, status: 'active'
    });
    if (error) showToast('Error: ' + error.message, 'error');
    else { showToast('Deal added!'); setShowAddDeal(false); setNewDeal({ client_name:'', client_email:'', client_phone:'', sale_amount:'', sale_date:'', property_type:'Retail', property_address:'' }); loadAll(); }
  }

  async function deleteDeal(id) {
    if (!window.confirm('Delete this deal?')) return;
    await supabase.from('ex_deals').delete().eq('id', id);
    showToast('Deal deleted'); loadAll();
  }

  async function matchProperties(deal) {
    try {
      const r = await fetch('https://n8n.diptyai.com/webhook/1031-property-match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id, client_name: deal.client_name, client_email: deal.client_email, sale_amount: deal.sale_amount, property_type: deal.property_type })
      });
      showToast('Property match email sent!');
    } catch { showToast('Webhook sent (check email)', 'info'); }
  }

  async function brokerOutreach(deal) {
    try {
      await fetch('https://n8n.diptyai.com/webhook/1031-broker-outreach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id, client_name: deal.client_name, sale_amount: deal.sale_amount, property_type: deal.property_type })
      });
      showToast('Broker outreach sent!');
    } catch { showToast('Outreach sent!', 'info'); }
  }

  async function addBooking(e) {
    e.preventDefault();
    const { error } = await supabase.from('wb_bookings').insert({ ...newBooking, status: 'confirmed' });
    if (error) showToast('Error: ' + error.message, 'error');
    else { showToast('Booking added!'); setShowAddBooking(false); setNewBooking({ client_name:'', client_email:'', booking_date:'', meeting_type:'Consultation', notes:'' }); loadAll(); }
  }

  async function generateApiKey() {
    const key = 'wb_' + Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
    const last4 = key.slice(-4);
    const { error } = await supabase.from('wb_api_keys').insert({ name: 'API Key ' + new Date().toLocaleDateString(), key_hash: key, last4, revoked: false });
    if (!error) { showToast('API key generated! Copy it now — it will be hidden.'); loadAll(); }
  }

  async function revokeKey(id) {
    await supabase.from('wb_api_keys').update({ revoked: true }).eq('id', id);
    showToast('Key revoked'); loadAll();
  }

  function exportCSV(data, filename) {
    if (!data.length) { showToast('No data to export', 'error'); return; }
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = filename + '.csv'; a.click();
    showToast('CSV downloaded!');
  }

  async function handleSignOut() {
    const ok = window.confirm('Sign out?');
    if (ok) await supabase.auth.signOut();
  }

  const urgentDeals = deals.filter(d => {
    if (!d.sale_date) return false;
    const days = Math.ceil((new Date(d.sale_date).getTime() + 45*86400000 - Date.now()) / 86400000);
    return days <= 10 && days >= 0;
  });

  const totalVolume = deals.reduce((s, d) => s + (parseFloat(d.sale_amount) || 0), 0);
  const filteredDeals = deals.filter(d => !search || d.client_name?.toLowerCase().includes(search.toLowerCase()) || d.client_email?.toLowerCase().includes(search.toLowerCase()) || d.property_type?.toLowerCase().includes(search.toLowerCase()));

  const primaryColor = tenant?.primary_color || '#16A34A';

  const css = {
    wrap: { fontFamily: 'Inter, sans-serif', background: '#0a0a0a', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column' },
    header: { background: '#111', borderBottom: '1px solid #222', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' },
    body: { display: 'flex', flex: 1 },
    sidebar: { width: '200px', background: '#111', borderRight: '1px solid #222', padding: '20px 12px' },
    main: { flex: 1, padding: '24px', overflowY: 'auto' },
    card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    btn: { border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
    input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#fff', width: '100%', fontSize: '0.9rem', boxSizing: 'border-box' },
  };

  const clock = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}:${String(time.getSeconds()).padStart(2,'0')}`;

  return (
    <div style={css.wrap}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:'20px', right:'20px', background: toast.type==='error' ? '#2a0a0a' : '#0a2a0a', border:`1px solid ${toast.type==='error' ? '#ef4444' : primaryColor}`, borderRadius:'10px', padding:'14px 20px', color: toast.type==='error' ? '#ef4444' : primaryColor, zIndex:9999, fontSize:'0.9rem' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={css.header}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {tenant?.logo_url ? <img src={tenant.logo_url} alt="logo" style={{ height:'32px' }} /> : <span style={{ fontSize:'1.2rem', fontWeight:'700', color: primaryColor }}>⚡</span>}
          <span style={{ fontWeight:'700', color:'#fff' }}>{tenant?.company_name || 'WealthBuilder 1031'}</span>
          <span style={{ background:'#1a1a2a', border:`1px solid ${primaryColor}33`, borderRadius:'6px', padding:'2px 8px', color: primaryColor, fontSize:'0.7rem' }}>{(tenant?.plan || 'basic').toUpperCase()}</span>
        </div>
        <div style={{ fontFamily:'monospace', fontSize:'1.1rem', color: primaryColor, background:'#0d1a0d', border:`1px solid ${primaryColor}44`, borderRadius:'8px', padding:'6px 14px', letterSpacing:'2px' }}>
          {clock}
        </div>
        <button onClick={handleSignOut} style={{ ...css.btn, background:'#1a1a1a', color:'#999', border:'1px solid #333' }}>Sign Out</button>
      </div>

      <div style={css.body}>
        {/* Sidebar */}
        <div style={css.sidebar}>
          {NAV.map(n => (
            <button key={n} onClick={() => setTab(n)} style={{ ...css.btn, width:'100%', textAlign:'left', background: tab===n ? `${primaryColor}22` : 'transparent', color: tab===n ? primaryColor : '#888', border: tab===n ? `1px solid ${primaryColor}44` : '1px solid transparent', marginBottom:'4px', padding:'10px 12px' }}>
              {ICONS[n]} {n}
            </button>
          ))}
        </div>

        {/* Main */}
        <div style={css.main}>

          {/* DASHBOARD TAB */}
          {tab === 'Dashboard' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px' }}>
                {[
                  { label:'Active Deals', value: deals.filter(d=>d.status==='active').length, color: primaryColor },
                  { label:'Urgent (≤10d)', value: urgentDeals.length, color:'#ef4444' },
                  { label:'Total Volume', value:`$${(totalVolume/1e6).toFixed(1)}M`, color:'#3b82f6' },
                  { label:'Bookings', value: bookings.length, color:'#f59e0b' },
                ].map((c,i) => (
                  <div key={i} style={css.card}>
                    <div style={{ color:'#666', fontSize:'0.75rem', marginBottom:'8px' }}>{c.label}</div>
                    <div style={{ fontSize:'2rem', fontWeight:'700', color:c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div style={css.card}>
                <h3 style={{ margin:'0 0 16px', color:'#fff' }}>Recent Deals</h3>
                {deals.slice(0,5).map(d => (
                  <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #1a1a1a' }}>
                    <div>
                      <div style={{ fontWeight:'600', color:'#fff' }}>{d.client_name}</div>
                      <div style={{ color:'#666', fontSize:'0.8rem' }}>{d.property_type} · ${parseFloat(d.sale_amount||0).toLocaleString()}</div>
                    </div>
                    <span style={{ background: d.status==='active'?'#0a2a0a':'#1a1a1a', color: d.status==='active'? primaryColor :'#666', borderRadius:'6px', padding:'4px 10px', fontSize:'0.75rem' }}>{d.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* DEALS TAB */}
          {tab === 'Deals' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <input placeholder="Search deals..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...css.input, width:'300px' }} />
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => exportCSV(deals, 'deals')} style={{ ...css.btn, background:'#1a2a3a', color:'#3b82f6', border:'1px solid #3b82f6' }}>📥 Export CSV</button>
                  <button onClick={() => setShowAddDeal(true)} style={{ ...css.btn, background: primaryColor, color:'#fff' }}>+ New Deal</button>
                </div>
              </div>
              {filteredDeals.map(d => (
                <div key={d.id} style={{ ...css.card, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:'700', color:'#fff', marginBottom:'4px' }}>{d.client_name}</div>
                    <div style={{ color:'#888', fontSize:'0.85rem' }}>{d.client_email} · {d.property_type}</div>
                    <div style={{ color: primaryColor, fontSize:'0.85rem', marginTop:'4px' }}>${parseFloat(d.sale_amount||0).toLocaleString()}</div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => matchProperties(d)} style={{ ...css.btn, background:'#1a2a1a', color: primaryColor, border:`1px solid ${primaryColor}` }}>🔍 Match</button>
                    <button onClick={() => brokerOutreach(d)} style={{ ...css.btn, background:'#1a1a2a', color:'#3b82f6', border:'1px solid #3b82f6' }}>📧 Outreach</button>
                    <button onClick={() => deleteDeal(d.id)} style={{ ...css.btn, background:'#2a0a0a', color:'#ef4444', border:'1px solid #ef4444' }}>🗑</button>
                  </div>
                </div>
              ))}

              {/* Add Deal Modal */}
              {showAddDeal && (
                <div style={{ position:'fixed', inset:0, background:'#000a', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
                  <div style={{ background:'#111', border:'1px solid #333', borderRadius:'16px', padding:'32px', width:'480px', maxWidth:'90vw' }}>
                    <h3 style={{ margin:'0 0 20px', color:'#fff' }}>New Deal</h3>
                    <form onSubmit={addDeal}>
                      {[
                        { label:'Client Name', key:'client_name', type:'text', required:true },
                        { label:'Email', key:'client_email', type:'email' },
                        { label:'Phone', key:'client_phone', type:'text' },
                        { label:'Sale Amount', key:'sale_amount', type:'number', required:true },
                        { label:'Sale Date', key:'sale_date', type:'date', required:true },
                        { label:'Property Address', key:'property_address', type:'text' },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom:'12px' }}>
                          <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>{f.label}</label>
                          <input type={f.type} required={f.required} value={newDeal[f.key]} onChange={e => setNewDeal(p => ({ ...p, [f.key]: e.target.value }))} style={css.input} />
                        </div>
                      ))}
                      <div style={{ marginBottom:'16px' }}>
                        <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Property Type</label>
                        <select value={newDeal.property_type} onChange={e => setNewDeal(p => ({ ...p, property_type: e.target.value }))} style={{ ...css.input }}>
                          {['Retail','Office','Industrial','Multifamily','Mixed-Use','Land'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                        <button type="button" onClick={() => setShowAddDeal(false)} style={{ ...css.btn, background:'#1a1a1a', color:'#999', border:'1px solid #333' }}>Cancel</button>
                        <button type="submit" style={{ ...css.btn, background: primaryColor, color:'#fff' }}>Add Deal</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PROPERTIES TAB */}
          {tab === 'Properties' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
                <h2 style={{ margin:0 }}>Properties</h2>
                <button onClick={() => exportCSV(properties, 'properties')} style={{ ...css.btn, background:'#1a2a3a', color:'#3b82f6', border:'1px solid #3b82f6' }}>📥 Export CSV</button>
              </div>
              {properties.length === 0 ? <div style={{ ...css.card, color:'#666', textAlign:'center' }}>No properties yet</div> :
                properties.map(p => (
                  <div key={p.id} style={css.card}>
                    <div style={{ fontWeight:'700', color:'#fff' }}>{p.property_name || p.address}</div>
                    <div style={{ color:'#888', fontSize:'0.85rem', marginTop:'4px' }}>{p.address} · ${parseFloat(p.price||0).toLocaleString()}</div>
                    {p.cap_rate && <div style={{ color: primaryColor, fontSize:'0.85rem', marginTop:'4px' }}>Cap Rate: {p.cap_rate}%</div>}
                  </div>
                ))
              }
            </>
          )}

          {/* OUTREACH TAB */}
          {tab === 'Outreach' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
                <h2 style={{ margin:0 }}>Email Outreach Log</h2>
                <button onClick={() => exportCSV(outreach, 'outreach')} style={{ ...css.btn, background:'#1a2a3a', color:'#3b82f6', border:'1px solid #3b82f6' }}>📥 Export CSV</button>
              </div>
              {outreach.length === 0 ? <div style={{ ...css.card, color:'#666', textAlign:'center' }}>No outreach yet — click "Outreach" on a deal</div> :
                outreach.map(o => (
                  <div key={o.id} style={{ ...css.card, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:'600', color:'#fff' }}>{o.broker_name || o.broker_email}</div>
                      <div style={{ color:'#888', fontSize:'0.8rem' }}>{o.broker_email}</div>
                      <div style={{ color:'#666', fontSize:'0.75rem', marginTop:'4px' }}>{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <span style={{ background:'#0a2a0a', color: primaryColor, borderRadius:'6px', padding:'4px 10px', fontSize:'0.75rem' }}>{o.status || 'sent'}</span>
                  </div>
                ))
              }
            </>
          )}

          {/* BOOKINGS TAB */}
          
          {tab === 'Reports' && (
            <div style={{padding: '24px'}}>
              <h2 style={{fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '24px'}}>
                📊 Property Match Reports
              </h2>
              {reports.length === 0 ? (
                <div style={{textAlign: 'center', padding: '60px', background: '#1a1a1a', borderRadius: '16px', border: '1px solid #333'}}>
                  <p style={{color: '#64748b', fontSize: '16px'}}>No reports yet. Run a property match to generate your first report!</p>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
                  {reports.map((report, index) => (
                    <div key={report.id} style={{background: '#1a1a1a', borderRadius: '16px', border: '1px solid #333', overflow: 'hidden'}}>
                      <div style={{padding: '20px 24px', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <h3 style={{fontSize: '18px', fontWeight: '700', marginBottom: '4px'}}>
                            🏢 {report.client_name} - Property Match Report
                          </h3>
                          <p style={{fontSize: '13px', opacity: '0.85'}}>
                            {new Date(report.created_at).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
                          </p>
                        </div>
                        <span style={{background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600'}}>
                          #{index + 1}
                        </span>
                      </div>
                      {report.html_report ? (
                        <iframe
                          srcDoc={report.html_report}
                          style={{width: '100%', height: '800px', border: 'none', display: 'block'}}
                          title={"Report " + (index+1)}
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>
                          <p>Report is being generated...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'Bookings' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
                <h2 style={{ margin:0 }}>Bookings</h2>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => exportCSV(bookings, 'bookings')} style={{ ...css.btn, background:'#1a2a3a', color:'#3b82f6', border:'1px solid #3b82f6' }}>📥 Export CSV</button>
                  <button onClick={() => setShowAddBooking(true)} style={{ ...css.btn, background: primaryColor, color:'#fff' }}>+ New Booking</button>
                </div>
              </div>
              {bookings.map(b => (
                <div key={b.id} style={css.card}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontWeight:'700', color:'#fff' }}>{b.client_name}</div>
                      <div style={{ color:'#888', fontSize:'0.85rem' }}>{b.meeting_type} · {b.booking_date}</div>
                      {b.notes && <div style={{ color:'#666', fontSize:'0.8rem', marginTop:'4px' }}>{b.notes}</div>}
                    </div>
                    <span style={{ background:'#0a2a0a', color: primaryColor, borderRadius:'6px', padding:'4px 10px', fontSize:'0.75rem', height:'fit-content' }}>{b.status}</span>
                  </div>
                </div>
              ))}
              {showAddBooking && (
                <div style={{ position:'fixed', inset:0, background:'#000a', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
                  <div style={{ background:'#111', border:'1px solid #333', borderRadius:'16px', padding:'32px', width:'440px' }}>
                    <h3 style={{ margin:'0 0 20px', color:'#fff' }}>New Booking</h3>
                    <form onSubmit={addBooking}>
                      {[
                        { label:'Client Name', key:'client_name', type:'text', required:true },
                        { label:'Email', key:'client_email', type:'email' },
                        { label:'Date', key:'booking_date', type:'date', required:true },
                        { label:'Notes', key:'notes', type:'text' },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom:'12px' }}>
                          <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>{f.label}</label>
                          <input type={f.type} required={f.required} value={newBooking[f.key]} onChange={e => setNewBooking(p => ({ ...p, [f.key]: e.target.value }))} style={css.input} />
                        </div>
                      ))}
                      <div style={{ marginBottom:'16px' }}>
                        <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Meeting Type</label>
                        <select value={newBooking.meeting_type} onChange={e => setNewBooking(p=>({...p, meeting_type: e.target.value}))} style={css.input}>
                          {['Consultation','Property Review','Follow-up','Closing'].map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                        <button type="button" onClick={()=>setShowAddBooking(false)} style={{ ...css.btn, background:'#1a1a1a', color:'#999', border:'1px solid #333' }}>Cancel</button>
                        <button type="submit" style={{ ...css.btn, background: primaryColor, color:'#fff' }}>Add Booking</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* SETTINGS TAB */}
          {tab === 'Settings' && (
            <div style={{ maxWidth:'700px' }}>
              <h2 style={{ marginBottom:'20px' }}>Settings</h2>

              {/* White Label */}
              {(tenant?.plan === 'pro' || tenant?.plan === 'enterprise') && (
                <div style={css.card}>
                  <h3 style={{ margin:'0 0 16px', color: primaryColor }}>🎨 White Label</h3>
                  <div style={{ marginBottom:'12px' }}>
                    <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Company Name</label>
                    <input value={tenant?.company_name || ''} onChange={e => setTenant(p=>({...p, company_name: e.target.value}))} style={css.input} />
                  </div>
                  <div style={{ marginBottom:'12px' }}>
                    <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Primary Color</label>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <input type="color" value={tenant?.primary_color || '#16A34A'} onChange={e => setTenant(p=>({...p, primary_color: e.target.value}))} style={{ width:'50px', height:'40px', borderRadius:'8px', border:'none', cursor:'pointer' }} />
                      <input value={tenant?.primary_color || '#16A34A'} onChange={e => setTenant(p=>({...p, primary_color: e.target.value}))} style={{ ...css.input, width:'120px' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Logo URL</label>
                    <input value={tenant?.logo_url || ''} onChange={e => setTenant(p=>({...p, logo_url: e.target.value}))} placeholder="https://..." style={css.input} />
                  </div>
                  <button onClick={async () => {
                    await supabase.from('wb_tenants').update({ company_name: tenant.company_name, primary_color: tenant.primary_color, logo_url: tenant.logo_url }).eq('id', tenant.id);
                    showToast('Branding saved! Refresh to see changes.');
                  }} style={{ ...css.btn, background: primaryColor, color:'#fff' }}>Save Branding</button>
                </div>
              )}

              {/* API Keys */}
              <div style={css.card}>
                <h3 style={{ margin:'0 0 16px', color:'#fff' }}>🔑 API Keys</h3>
                {apiKeys.map(k => (
                  <div key={k.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #1a1a1a' }}>
                    <div>
                      <div style={{ color:'#fff', fontSize:'0.9rem' }}>{k.name}</div>
                      <div style={{ color:'#666', fontSize:'0.8rem', fontFamily:'monospace' }}>••••••••••••{k.last4}</div>
                    </div>
                    <button onClick={() => revokeKey(k.id)} style={{ ...css.btn, background:'#2a0a0a', color:'#ef4444', border:'1px solid #ef4444' }}>Revoke</button>
                  </div>
                ))}
                <button onClick={generateApiKey} style={{ ...css.btn, background:'#1a2a1a', color: primaryColor, border:`1px solid ${primaryColor}`, marginTop:'12px' }}>+ Generate Key</button>
              </div>

              {/* Webhooks */}
              <div style={css.card}>
                <h3 style={{ margin:'0 0 16px', color:'#fff' }}>🔗 Webhooks</h3>
                <div style={{ marginBottom:'12px' }}>
                  <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Incoming Webhook URL (n8n)</label>
                  <input readOnly value="https://n8n.diptyai.com/webhook/1031-deal-intake" style={{ ...css.input, color:'#666', cursor:'text' }} />
                </div>
                <div style={{ marginBottom:'12px' }}>
                  <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'4px' }}>Outgoing Webhook (CRM URL)</label>
                  <input value={settings.webhook_outgoing} onChange={e => setSettings(p=>({...p, webhook_outgoing: e.target.value}))} placeholder="https://your-crm.com/webhook" style={css.input} />
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={async () => {
                    if (!settings.webhook_outgoing) { showToast('Enter a webhook URL first', 'error'); return; }
                    try {
                      await fetch(settings.webhook_outgoing, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }) });
                      showToast('Test webhook sent!');
                    } catch { showToast('Webhook sent (CORS may block response)', 'info'); }
                  }} style={{ ...css.btn, background:'#1a2a3a', color:'#3b82f6', border:'1px solid #3b82f6' }}>Test</button>
                  <button onClick={async () => {
                    await supabase.from('wb_settings').update({ webhook_outgoing: settings.webhook_outgoing }).eq('id', (await supabase.from('wb_settings').select('id').limit(1)).data?.[0]?.id);
                    showToast('Webhook URL saved!');
                  }} style={{ ...css.btn, background: primaryColor, color:'#fff' }}>Save</button>
                </div>
              </div>

              {/* Plan Info */}
              <div style={css.card}>
                <h3 style={{ margin:'0 0 12px', color:'#fff' }}>📋 Plan</h3>
                <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                  <span style={{ background:'#1a2a1a', border:`1px solid ${primaryColor}`, borderRadius:'8px', padding:'8px 20px', color: primaryColor, fontWeight:'700', fontSize:'1.1rem' }}>
                    {(tenant?.plan || 'basic').toUpperCase()}
                  </span>
                  <div style={{ color:'#888', fontSize:'0.85rem' }}>
                    Client limit: {tenant?.client_limit === 999999 ? 'Unlimited' : tenant?.client_limit || 10}
                    <br/>
                    {tenant?.plan === 'basic' && <span style={{ color:'#f59e0b' }}>Upgrade to Pro for white label & unlimited clients</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



