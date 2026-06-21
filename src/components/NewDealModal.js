import { useState } from 'react';
import { supabase } from '../supabase';

export default function NewDealModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '',
    sale_date: '', sale_amount: '', property_sold_type: 'retail',
    property_sold_address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.client_name || !form.client_email || !form.sale_date || !form.sale_amount) {
      setError('Please fill all required fields'); return;
    }
    setLoading(true); setError('');
    const saleDate = new Date(form.sale_date);
    const deadline45 = new Date(saleDate); deadline45.setDate(deadline45.getDate() + 45);
    const deadline180 = new Date(saleDate); deadline180.setDate(deadline180.getDate() + 180);

    const { error: err } = await supabase.from('ex_deals').insert([{
      ...form,
      sale_amount: parseFloat(form.sale_amount),
      deadline_45: deadline45.toISOString().split('T')[0],
      deadline_180: deadline180.toISOString().split('T')[0],
      status: 'active'
    }]);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onAdded(); onClose();
  };

  const s = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 },
    modal: { background:'var(--bg)',border:'1px solid #222',borderRadius:16,padding:'28px 32px',width:520,maxWidth:'95vw' },
    title: { fontSize:18,fontWeight:600,color:'var(--text)',marginBottom:20 },
    section: { fontSize:11,fontWeight:600,color:'#666',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10,marginTop:16 },
    row: { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 },
    label: { fontSize:12,color:'#888',marginBottom:4 },
    input: { width:'100%',background:'#111',border:'1px solid #2a2a2a',borderRadius:8,padding:'9px 12px',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif' },
    select: { width:'100%',background:'#111',border:'1px solid #2a2a2a',borderRadius:8,padding:'9px 12px',color:'var(--text)',fontSize:13,outline:'none' },
    footer: { display:'flex',justifyContent:'flex-end',gap:10,marginTop:24 },
    btnCancel: { padding:'9px 20px',borderRadius:8,border:'1px solid #333',background:'transparent',color:'#888',fontSize:13,cursor:'pointer' },
    btnAdd: { padding:'9px 24px',borderRadius:8,border:'none',background:'#00e676',color:'#000',fontSize:13,fontWeight:600,cursor:'pointer' },
    error: { background:'#2a0a0a',border:'1px solid #5a1a1a',borderRadius:8,padding:'8px 12px',color:'#ff6b6b',fontSize:12,marginTop:8 }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.title}>Add new exchange deal</div>
        <div style={s.section}>Client information</div>
        <div style={s.row}>
          <div><div style={s.label}>Full name *</div><input style={s.input} name="client_name" placeholder="John Smith" value={form.client_name} onChange={handle} /></div>
          <div><div style={s.label}>Email *</div><input style={s.input} name="client_email" placeholder="john@email.com" value={form.client_email} onChange={handle} /></div>
        </div>
        <div><div style={s.label}>Phone</div><input style={s.input} name="client_phone" placeholder="+1 555 000 0000" value={form.client_phone} onChange={handle} /></div>
        <div style={s.section}>Sale details</div>
        <div style={s.row}>
          <div><div style={s.label}>Sale date *</div><input style={s.input} type="date" name="sale_date" value={form.sale_date} onChange={handle} /></div>
          <div><div style={s.label}>Sale amount ($) *</div><input style={s.input} name="sale_amount" placeholder="5000000" value={form.sale_amount} onChange={handle} /></div>
        </div>
        <div style={s.row}>
          <div><div style={s.label}>Property type</div>
            <select style={s.select} name="property_sold_type" value={form.property_sold_type} onChange={handle}>
              <option value="retail">Retail</option>
              <option value="office">Office</option>
              <option value="industrial">Industrial</option>
              <option value="multifamily">Multifamily</option>
              <option value="mixed">Mixed Use</option>
            </select>
          </div>
          <div><div style={s.label}>Property address</div><input style={s.input} name="property_sold_address" placeholder="123 Main St, Austin TX" value={form.property_sold_address} onChange={handle} /></div>
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.footer}>
          <button style={s.btnCancel} onClick={onClose}>Cancel</button>
          <button style={s.btnAdd} onClick={submit} disabled={loading}>{loading ? 'Adding...' : 'Add deal'}</button>
        </div>
      </div>
    </div>
  );
}
