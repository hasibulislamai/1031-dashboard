import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, N8N_BASE } from '../supabase';
import {
  LayoutDashboard, Briefcase, Building2, Mail, BarChart3, CalendarClock,
  FileSpreadsheet, Settings as SettingsIcon, TrendingUp, LogOut, Search,
  Plus, X, Trash2, Pencil, RefreshCw, Copy, KeyRound, Webhook, Bell,
  ShieldCheck, ChevronRight, ChevronDown, Send, AlertTriangle, CheckCircle2,
  XCircle, Clock, DollarSign, Target, Loader2, Upload, Info, ArrowUpDown,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Papa from 'papaparse';

/* ── constants ── */
const dayMs = 86400000;
const C = { text:'#37352F', textMuted:'#787774', border:'#E9E9E7', bgAlt:'#F7F7F5' };
const PROP_TYPES = ['Retail','Office','Industrial','Multifamily'];
const NAV = [
  { key:'dashboard', label:'Dashboard', icon:LayoutDashboard },
  { key:'deals',     label:'Deals',     icon:Briefcase },
  { key:'properties',label:'Properties',icon:Building2 },
  { key:'outreach',  label:'Outreach',  icon:Mail },
  { key:'reports',   label:'Reports',   icon:BarChart3 },
  { key:'deadlines', label:'Deadlines', icon:CalendarClock },
  { key:'csv',       label:'CSV Upload',icon:FileSpreadsheet },
  { key:'insights',  label:'Insights',  icon:TrendingUp },
  { key:'settings',  label:'Settings',  icon:SettingsIcon },
];

/* ── helpers ── */
const cls = (...a) => a.filter(Boolean).join(' ');
const genId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const pad = (n) => String(n).padStart(2,'0');
const addDays = (d,n) => new Date(new Date(d).getTime()+n*dayMs);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtMoney = (n) => '$'+Math.round(Number(n)||0).toLocaleString('en-US');
const fmtShort = (n) => { n=Number(n)||0; if(Math.abs(n)>=1e6) return '$'+(n/1e6).toFixed(2)+'M'; if(Math.abs(n)>=1e3) return '$'+(n/1e3).toFixed(0)+'K'; return '$'+Math.round(n); };

function getDealUrgency(d) {
  if(d.status==='closed') return {key:'closed',label:'Closed',color:'gray',daysLeft:null,deadlineLabel:'—'};
  const now=Date.now(), d45=new Date(d.deadline_45).getTime(), d180=new Date(d.deadline_180).getTime();
  let target,deadlineLabel;
  if(now<d45){target=d45;deadlineLabel='45-day';}else{target=d180;deadlineLabel='180-day';}
  const daysLeft=Math.ceil((target-now)/dayMs);
  let key,color,label;
  if(daysLeft<7){key='critical';color='red';label='Critical';}
  else if(daysLeft<30){key='urgent';color='amber';label='Urgent';}
  else{key='on_track';color='green';label='On track';}
  return {key,label,color,daysLeft,deadlineLabel,deadlineDate:new Date(target)};
}

/* ── atoms ── */
function Badge({children,color}){
  const m={green:'background:#DCFCE7;color:#15803D',amber:'background:#FEF3C7;color:#B45309',red:'background:#FEE2E2;color:#DC2626',gray:`background:${C.bgAlt};color:${C.textMuted}`};
  return <span style={{...(()=>{const[bg,cl]=(m[color]||m.gray).split(';').map(s=>s.split(':')[1]);return{background:bg,color:cl}})(),padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:500,whiteSpace:'nowrap'}}>{children}</span>;
}

function Btn({children,onClick,variant='primary',size='sm',className='',type='button',disabled,style={}}){
  const base={display:'inline-flex',alignItems:'center',gap:6,borderRadius:6,fontWeight:500,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,fontFamily:'inherit',transition:'all 0.15s',...style};
  const sz={sm:{padding:'6px 10px',fontSize:12},md:{padding:'8px 14px',fontSize:13}};
  const v={primary:{background:'#16A34A',color:'white',border:'none'},danger:{background:'#DC2626',color:'white',border:'none'},ghost:{background:'transparent',color:C.text,border:`1px solid ${C.border}`},subtle:{background:'transparent',color:C.textMuted,border:'none'}};
  return <button type={type} disabled={disabled} onClick={onClick} className={className} style={{...base,...sz[size],...v[variant]}}>{children}</button>;
}

function IconBtn({icon:Icon,onClick,title,danger}){
  return <button onClick={onClick} title={title} style={{padding:6,borderRadius:4,background:'transparent',border:'none',cursor:'pointer',color:danger?'#DC2626':C.textMuted,display:'flex',alignItems:'center'}}><Icon size={14}/></button>;
}

function Field({label,children,hint}){
  return(
    <label style={{display:'block',marginBottom:12}}>
      <span style={{display:'block',fontSize:11,fontWeight:500,color:C.textMuted,marginBottom:4}}>{label}</span>
      {children}
      {hint&&<span style={{display:'block',fontSize:11,marginTop:3,color:C.textMuted}}>{hint}</span>}
    </label>
  );
}

const iStyle={width:'100%',padding:'7px 10px',fontSize:13,border:`1px solid ${C.border}`,borderRadius:6,outline:'none',fontFamily:'inherit',color:C.text,background:'#fff',boxSizing:'border-box'};
function Input(p){return<input {...p} style={{...iStyle,...p.style}}/>;}
function Select(p){return<select {...p} style={{...iStyle,...p.style}}/>;}

function Modal({title,onClose,children,width='480px'}){
  return(
    <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(55,53,47,0.45)'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:10,border:`1px solid ${C.border}`,width:'100%',maxWidth:width,maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <h3 style={{fontWeight:600,fontSize:13,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4,color:C.textMuted}}><X size={16}/></button>
        </div>
        <div style={{padding:20,overflowY:'auto'}}>{children}</div>
      </div>
    </div>
  );
}

function Drawer({title,onClose,children,width='440px'}){
  return(
    <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',justifyContent:'flex-end',background:'rgba(55,53,47,0.45)'}} onClick={onClose}>
      <div style={{background:'#fff',height:'100%',overflowY:'auto',borderLeft:`1px solid ${C.border}`,width,display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,position:'sticky',top:0,background:'#fff',zIndex:10}}>
          <h3 style={{fontWeight:600,fontSize:13,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.textMuted}}><X size={16}/></button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function Confirm({state,onCancel}){
  if(!state) return null;
  return(
    <Modal title={state.title} onClose={onCancel} width="360px">
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>{state.message}</p>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant={state.danger?'danger':'primary'} onClick={()=>{state.onConfirm();onCancel();}}>{state.confirmLabel||'Confirm'}</Btn>
      </div>
    </Modal>
  );
}

function Toasts({toasts}){
  return(
    <div style={{position:'fixed',bottom:16,right:16,zIndex:60,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} style={{padding:'10px 16px',borderRadius:8,fontSize:13,display:'flex',alignItems:'center',gap:8,color:'white',background:t.type==='error'?'#DC2626':'#16A34A',minWidth:200,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
          {t.type==='error'?<XCircle size={15}/>:<CheckCircle2 size={15}/>}{t.msg}
        </div>
      ))}
    </div>
  );
}

function MetricCard({label,value,color,sub}){
  const colors={red:'#DC2626',amber:'#D97706',green:'#16A34A'};
  return(
    <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 14px'}}>
      <div style={{fontSize:10,fontWeight:500,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{label}</div>
      <div style={{fontFamily:'ui-monospace,monospace',fontSize:20,fontWeight:600,color:colors[color]||C.text}}>{value}</div>
      {sub&&<div style={{fontSize:11,marginTop:3,color:C.textMuted}}>{sub}</div>}
    </div>
  );
}

function EmptyState({icon:Icon,text}){
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 0',color:C.textMuted}}>
      <Icon size={28} style={{marginBottom:8,opacity:0.4}}/><p style={{fontSize:13}}>{text}</p>
    </div>
  );
}

function Section({title,subtitle,children}){
  return(
    <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:13,color:C.text}}>{title}</div>
      {subtitle&&<div style={{fontSize:12,color:C.textMuted,marginTop:2,marginBottom:12}}>{subtitle}</div>}
      <div style={{marginTop:subtitle?0:8}}>{children}</div>
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({page,setPage,collapsed,now,onLogout}){
  const clock=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  return(
    <div style={{height:'100%',background:'#fff',borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0,width:collapsed?64:220,transition:'width 0.2s'}}>
      <div style={{padding:'16px 12px 12px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:24,height:24,borderRadius:6,background:'#16A34A',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:12,flexShrink:0}}>W</div>
          {!collapsed&&<span style={{fontSize:13,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>WealthBuilder 1031</span>}
        </div>
        {!collapsed&&(
          <div style={{marginTop:8,fontFamily:'ui-monospace,monospace',fontSize:11,color:C.textMuted}}>
            <div>{clock}</div><div>{date}</div>
          </div>
        )}
      </div>
      <nav style={{flex:1,overflowY:'auto',padding:'8px 8px'}}>
        {NAV.map(n=>{
          const active=page===n.key; const Icon=n.icon;
          return(
            <button key={n.key} onClick={()=>setPage(n.key)} title={collapsed?n.label:undefined}
              style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'7px 10px',borderRadius:6,fontSize:13,border:'none',cursor:'pointer',marginBottom:2,fontFamily:'inherit',
                background:active?'#F0FDF4':'transparent',color:active?'#15803D':C.text,fontWeight:active?500:400}}>
              <Icon size={16} style={{flexShrink:0}}/>
              {!collapsed&&<span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.label}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{padding:8,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onLogout} title={collapsed?'Sign out':undefined}
          style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'7px 10px',borderRadius:6,fontSize:13,border:'none',cursor:'pointer',background:'transparent',color:C.textMuted,fontFamily:'inherit'}}>
          <LogOut size={16} style={{flexShrink:0}}/>{!collapsed&&<span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

/* ── Deal Drawer ── */
function DealDrawer({deal,properties,outreach,onClose,onSave}){
  const [form,setForm]=useState({...deal});
  const u=getDealUrgency(deal);
  const matched=properties.filter(p=>p.property_type===deal.property_type);
  const linked=outreach.filter(o=>o.deal_id===deal.id);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  return(
    <Drawer title={deal.client_name} onClose={onClose}>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <Badge color={u.color}>{u.label}</Badge>
        {u.daysLeft!==null&&<span style={{fontSize:11,color:C.textMuted}}>{u.daysLeft}d to {u.deadlineLabel} deadline ({fmtDate(u.deadlineDate)})</span>}
      </div>
      <Field label="Client name"><Input value={form.client_name||''} onChange={set('client_name')}/></Field>
      <Field label="Email"><Input value={form.client_email||''} onChange={set('client_email')}/></Field>
      <Field label="Phone"><Input value={form.client_phone||''} onChange={set('client_phone')}/></Field>
      <Field label="Sale amount"><Input type="number" value={form.sale_amount||''} onChange={e=>setForm(f=>({...f,sale_amount:Number(e.target.value)}))} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
      <Field label="Property type"><Select value={form.property_type||'Retail'} onChange={set('property_type')}>{PROP_TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
      <Field label="Property address"><Input value={form.property_address||''} onChange={set('property_address')}/></Field>
      <Field label="Status"><Select value={form.status||'active'} onChange={set('status')}><option value="active">Active</option><option value="closed">Closed</option></Select></Field>
      <Btn onClick={()=>onSave(deal.id,form)} style={{marginBottom:20}}>Save changes</Btn>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:C.textMuted,marginBottom:8}}>Deadlines</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>
          <div>45-day: {fmtDate(deal.deadline_45)}</div>
          <div>180-day: {fmtDate(deal.deadline_180)}</div>
        </div>
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:C.textMuted,marginBottom:8}}>Matched properties ({deal.property_type})</div>
        {matched.slice(0,4).map(p=>(
          <div key={p.id} style={{border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 10px',marginBottom:6}}>
            <div style={{fontSize:13,color:C.text}}>{p.address}, {p.city} {p.state}</div>
            <div style={{fontSize:11,fontFamily:'ui-monospace,monospace',color:C.textMuted}}>{fmtMoney(p.price)} · {p.cap_rate}% cap</div>
          </div>
        ))}
        {matched.length===0&&<p style={{fontSize:12,color:C.textMuted}}>No properties of this type yet.</p>}
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
        <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:C.textMuted,marginBottom:8}}>Outreach log</div>
        {linked.map(o=>(
          <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',border:`1px solid ${C.border}`,borderRadius:6,padding:'7px 10px',marginBottom:6}}>
            <span style={{fontSize:12,color:C.text}}>{o.broker_email}</span>
            <Badge color={o.status==='replied'?'green':o.status==='sent'?'amber':'gray'}>{o.status.replace('_',' ')}</Badge>
          </div>
        ))}
        {linked.length===0&&<p style={{fontSize:12,color:C.textMuted}}>No outreach logged yet.</p>}
      </div>
    </Drawer>
  );
}

/* ── New Deal Modal ── */
function NewDealModal({onClose,onCreate}){
  const [f,setF]=useState({client_name:'',client_email:'',client_phone:'',sale_date:new Date().toISOString().slice(0,10),sale_amount:'',property_type:'Retail',property_address:''});
  const set=k=>e=>setF(s=>({...s,[k]:e.target.value}));
  return(
    <Modal title="New deal" onClose={onClose}>
      <Field label="Client name"><Input value={f.client_name} onChange={set('client_name')} placeholder="Jane Doe"/></Field>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Field label="Email"><Input value={f.client_email} onChange={set('client_email')}/></Field>
        <Field label="Phone"><Input value={f.client_phone} onChange={set('client_phone')}/></Field>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Field label="Sale date"><Input type="date" value={f.sale_date} onChange={set('sale_date')}/></Field>
        <Field label="Sale amount"><Input type="number" value={f.sale_amount} onChange={set('sale_amount')} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
      </div>
      <Field label="Property type"><Select value={f.property_type} onChange={set('property_type')}>{PROP_TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
      <Field label="Relinquished property address" hint="45-day and 180-day deadlines auto-calculate from sale date."><Input value={f.property_address} onChange={set('property_address')}/></Field>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!f.client_name||!f.sale_amount} onClick={()=>onCreate({...f,sale_amount:Number(f.sale_amount)})}>Create deal</Btn>
      </div>
    </Modal>
  );
}

/* ── Match / Outreach Modals ── */
function MatchModal({deal,properties,onClose,onMatch,loading}){
  const list=properties.filter(p=>p.property_type===deal.property_type);
  return(
    <Modal title={`Match properties — ${deal.client_name}`} onClose={onClose} width="540px">
      <p style={{fontSize:12,color:C.textMuted,marginBottom:12}}>Showing {deal.property_type.toLowerCase()} properties from your database.</p>
      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:320,overflowY:'auto'}}>
        {list.map(p=>(
          <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 12px'}}>
            <div>
              <div style={{fontSize:13,color:C.text}}>{p.address}, {p.city} {p.state}</div>
              <div style={{fontSize:11,fontFamily:'ui-monospace,monospace',color:C.textMuted}}>{fmtMoney(p.price)} · {p.cap_rate}% cap · {p.broker_name}</div>
            </div>
            <Btn size="sm" disabled={loading} onClick={()=>onMatch(deal,p)}>Mark matched</Btn>
          </div>
        ))}
        {list.length===0&&<EmptyState icon={Building2} text="No matching properties in database."/>}
      </div>
    </Modal>
  );
}

function OutreachModal({deal,properties,onClose,onSend,loading}){
  const list=properties.filter(p=>p.property_type===deal.property_type);
  const [propId,setPropId]=useState(list[0]?.id||'');
  const selected=properties.find(p=>p.id===propId);
  return(
    <Modal title={`Broker outreach — ${deal.client_name}`} onClose={onClose}>
      <Field label="Property"><Select value={propId} onChange={e=>setPropId(e.target.value)}>{list.map(p=><option key={p.id} value={p.id}>{p.address}, {p.city} {p.state}</option>)}</Select></Field>
      {selected&&<Field label="Broker email"><Input value={selected.broker_email} readOnly style={{background:C.bgAlt}}/></Field>}
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!selected||loading} onClick={()=>onSend(deal,selected)}><Send size={13}/> {loading?'Sending...':'Send outreach'}</Btn>
      </div>
    </Modal>
  );
}

/* ── Property Modal ── */
function PropertyModal({mode,data,onClose,onSave}){
  const [f,setF]=useState(data||{address:'',city:'',state:'',price:'',cap_rate:'',property_type:'Retail',broker_name:'',broker_email:'',broker_phone:''});
  const set=k=>e=>setF(s=>({...s,[k]:e.target.value}));
  const noi=Math.round((Number(f.price)||0)*((Number(f.cap_rate)||0)/100));
  return(
    <Modal title={mode==='edit'?'Edit property':'Add property'} onClose={onClose} width="520px">
      <Field label="Address"><Input value={f.address} onChange={set('address')}/></Field>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Field label="City"><Input value={f.city} onChange={set('city')}/></Field>
        <Field label="State"><Input value={f.state} onChange={set('state')}/></Field>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Field label="Price"><Input type="number" value={f.price} onChange={set('price')} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
        <Field label="Cap rate %"><Input type="number" step="0.1" value={f.cap_rate} onChange={set('cap_rate')} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
      </div>
      <Field label="Property type"><Select value={f.property_type} onChange={set('property_type')}>{PROP_TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
      <Field label="NOI (auto-calculated)"><Input value={fmtMoney(noi)} readOnly style={{background:C.bgAlt,fontFamily:'ui-monospace,monospace'}}/></Field>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Field label="Broker name"><Input value={f.broker_name} onChange={set('broker_name')}/></Field>
        <Field label="Broker phone"><Input value={f.broker_phone} onChange={set('broker_phone')}/></Field>
      </div>
      <Field label="Broker email"><Input value={f.broker_email} onChange={set('broker_email')}/></Field>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave({...f,price:Number(f.price),cap_rate:Number(f.cap_rate),noi})}>{mode==='edit'?'Save changes':'Add property'}</Btn>
      </div>
    </Modal>
  );
}

/* ── Pages ── */
function DashboardPage({deals,properties,outreach,nav,onRowClick,onMatch,onOutreach,onDeleteDeal,onNewDeal,actionLoading}){
  const active=useMemo(()=>deals.filter(d=>d.status!=='closed').map(d=>({d,u:getDealUrgency(d)})).sort((a,b)=>(a.u.daysLeft??999)-(b.u.daysLeft??999)).slice(0,8),[deals]);
  const metrics=useMemo(()=>{
    const nc=deals.filter(d=>d.status!=='closed'); const u=nc.map(d=>getDealUrgency(d).key);
    return{critical:u.filter(k=>k==='critical').length,urgent:u.filter(k=>k==='urgent').length,onTrack:u.filter(k=>k==='on_track').length,
      matched:deals.reduce((s,d)=>s+(d.properties_matched_count||0),0),meetings:outreach.filter(o=>o.status==='replied').length,
      pipeline:nc.reduce((s,d)=>s+d.sale_amount,0)};
  },[deals,outreach]);
  const months6=useMemo(()=>{const now=new Date();return Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);const label=d.toLocaleDateString('en-US',{month:'short',year:'2-digit'});const inM=deals.filter(dl=>{ const sd=new Date(dl.created_at); return sd.getFullYear()===d.getFullYear()&&sd.getMonth()===d.getMonth();});return{month:label,count:inM.length};});},[deals]);
  const activity=useMemo(()=>[...deals.map(d=>({date:d.created_at,text:`Deal created — ${d.client_name}`})),...outreach.map(o=>({date:o.sent_at,text:`Outreach sent to ${o.broker_email.split('@')[0]}`}))].sort((x,y)=>new Date(y.date)-new Date(x.date)).slice(0,8),[deals,outreach]);
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <h1 style={{fontSize:18,fontWeight:600,color:C.text}}>Dashboard</h1>
        <Btn onClick={onNewDeal}><Plus size={14}/> New deal</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:20}}>
        <MetricCard label="Critical" value={metrics.critical} color="red"/>
        <MetricCard label="Urgent" value={metrics.urgent} color="amber"/>
        <MetricCard label="On track" value={metrics.onTrack} color="green"/>
        <MetricCard label="Matched" value={metrics.matched}/>
        <MetricCard label="Meetings" value={metrics.meetings}/>
        <MetricCard label="Pipeline" value={fmtShort(metrics.pipeline)}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:`1px solid ${C.border}`}}>
              <h2 style={{fontSize:13,fontWeight:600,color:C.text}}>Active deals</h2>
              <button onClick={()=>nav('deals')} style={{fontSize:11,fontWeight:500,color:'#15803D',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>View all<ChevronRight size={11}/></button>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                  {['Client','Type','Value','Days','Status','Actions'].map(h=><th key={h} style={{textAlign:'left',fontSize:10,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 12px'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {active.map(({d,u})=>(
                    <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer'}} onClick={()=>onRowClick(d)}>
                      <td style={{padding:'8px 12px',fontSize:13,color:C.text}}>{d.client_name}</td>
                      <td style={{padding:'8px 12px',fontSize:12,color:C.textMuted}}>{d.property_type}</td>
                      <td style={{padding:'8px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>{fmtShort(d.sale_amount)}</td>
                      <td style={{padding:'8px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:u.color==='red'?'#DC2626':u.color==='amber'?'#D97706':'#16A34A'}}>{u.daysLeft}d</td>
                      <td style={{padding:'8px 12px'}}><Badge color={u.color}>{u.label}</Badge></td>
                      <td style={{padding:'8px 12px'}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:'flex',gap:2}}>
                          <IconBtn icon={Target} title="Match" onClick={()=>onMatch(d)}/>
                          <IconBtn icon={Mail} title="Outreach" onClick={()=>onOutreach(d)}/>
                          <IconBtn icon={Trash2} title="Delete" danger onClick={()=>onDeleteDeal(d)}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {active.length===0&&<tr><td colSpan={6}><EmptyState icon={Briefcase} text="No active deals yet."/></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
            <h2 style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Monthly deal volume</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={months6}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:C.textMuted}} axisLine={{stroke:C.border}} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.textMuted}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <RTooltip contentStyle={{fontSize:12,borderRadius:6,borderColor:C.border}}/>
                <Bar dataKey="count" name="Deals" fill="#16A34A" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
          <h2 style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Recent activity</h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {activity.map((a,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#16A34A',marginTop:5,flexShrink:0}}/>
                <div><div style={{color:C.text}}>{a.text}</div><div style={{fontSize:10,fontFamily:'ui-monospace,monospace',color:C.textMuted,marginTop:2}}>{fmtDate(a.date)}</div></div>
              </div>
            ))}
            {activity.length===0&&<EmptyState icon={Clock} text="No activity yet."/>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealsPage({deals,onRowClick,onMatch,onOutreach,onDelete,onNewDeal}){
  const [search,setSearch]=useState('');
  const [statusF,setStatusF]=useState('all');
  const [typeF,setTypeF]=useState('all');
  const rows=useMemo(()=>{
    let r=deals.map(d=>({d,u:getDealUrgency(d)}));
    if(search){const s=search.toLowerCase();r=r.filter(({d})=>d.client_name?.toLowerCase().includes(s)||d.property_address?.toLowerCase().includes(s));}
    if(statusF!=='all') r=r.filter(({u})=>u.key===statusF);
    if(typeF!=='all') r=r.filter(({d})=>d.property_type===typeF);
    return r.sort((a,b)=>(a.u.daysLeft??9999)-(b.u.daysLeft??9999));
  },[deals,search,statusF,typeF]);
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:600,color:C.text}}>Deals</h1>
        <Btn onClick={onNewDeal}><Plus size={14}/> New deal</Btn>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <div style={{position:'relative'}}>
          <Search size={13} style={{position:'absolute',left:9,top:9,color:C.textMuted}}/>
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{paddingLeft:28,width:200}}/>
        </div>
        <Select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:160}}>
          <option value="all">All statuses</option><option value="critical">Critical</option><option value="urgent">Urgent</option><option value="on_track">On track</option><option value="closed">Closed</option>
        </Select>
        <Select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{width:150}}>
          <option value="all">All types</option>{PROP_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </Select>
        <span style={{fontSize:12,color:C.textMuted,marginLeft:'auto',alignSelf:'center'}}>{rows.length} deals</span>
      </div>
      <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {['Client','Type','Value','Days left','Status','Actions'].map(h=><th key={h} style={{textAlign:'left',fontSize:10,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 12px'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({d,u})=>(
              <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer'}} onClick={()=>onRowClick(d)}>
                <td style={{padding:'10px 12px',fontSize:13,color:C.text}}>{d.client_name}<div style={{fontSize:11,color:C.textMuted}}>{d.property_address}</div></td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.textMuted}}>{d.property_type}</td>
                <td style={{padding:'10px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>{fmtMoney(d.sale_amount)}</td>
                <td style={{padding:'10px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:u.color==='red'?'#DC2626':u.color==='amber'?'#D97706':u.color==='green'?'#16A34A':C.textMuted}}>{u.daysLeft!==null?`${u.daysLeft}d`:'—'}</td>
                <td style={{padding:'10px 12px'}}><Badge color={u.color}>{u.label}</Badge></td>
                <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:'flex',gap:2}}>
                    <IconBtn icon={Target} title="Match" onClick={()=>onMatch(d)}/>
                    <IconBtn icon={Mail} title="Outreach" onClick={()=>onOutreach(d)}/>
                    <IconBtn icon={Trash2} title="Delete" danger onClick={()=>onDelete(d)}/>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={6}><EmptyState icon={Search} text="No deals match your filters."/></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PropertiesPage({properties,onNew,onEdit,onDelete}){
  const [typeF,setTypeF]=useState('all');
  const rows=useMemo(()=>properties.filter(p=>typeF==='all'||p.property_type===typeF),[properties,typeF]);
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:600,color:C.text}}>Properties</h1>
        <Btn onClick={onNew}><Plus size={14}/> Add property</Btn>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <Select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{width:160}}>
          <option value="all">All types</option>{PROP_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </Select>
        <span style={{fontSize:12,color:C.textMuted,marginLeft:'auto',alignSelf:'center'}}>{rows.length} properties</span>
      </div>
      <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {['Address','Type','Price','Cap rate','NOI','Broker','Actions'].map(h=><th key={h} style={{textAlign:'left',fontSize:10,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 12px'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(p=>(
              <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:'10px 12px',fontSize:13,color:C.text}}>{p.address}<div style={{fontSize:11,color:C.textMuted}}>{p.city}, {p.state}</div></td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.textMuted}}>{p.property_type}</td>
                <td style={{padding:'10px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>{fmtMoney(p.price)}</td>
                <td style={{padding:'10px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>{p.cap_rate}%</td>
                <td style={{padding:'10px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>{fmtMoney(p.noi)}</td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.textMuted}}>{p.broker_name}</td>
                <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:'flex',gap:2}}>
                    <IconBtn icon={Pencil} title="Edit" onClick={()=>onEdit(p)}/>
                    <IconBtn icon={Trash2} title="Delete" danger onClick={()=>onDelete(p)}/>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={7}><EmptyState icon={Building2} text="No properties yet."/></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OutreachPage({outreach,deals,onLogNew}){
  const replied=outreach.filter(o=>o.status==='replied').length;
  const rate=outreach.length?Math.round((replied/outreach.length)*100):0;
  const dealName=id=>deals.find(d=>d.id===id)?.client_name||'—';
  const rows=useMemo(()=>outreach.slice().sort((a,b)=>new Date(b.sent_at)-new Date(a.sent_at)),[outreach]);
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:600,color:C.text}}>Outreach</h1>
        <Btn onClick={onLogNew}><Plus size={14}/> Log outreach</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16,maxWidth:360}}>
        <MetricCard label="Total sent" value={outreach.length}/>
        <MetricCard label="Replied" value={replied} color="green"/>
        <MetricCard label="Response rate" value={rate+'%'}/>
      </div>
      <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {['Deal','Broker','Sent','Status'].map(h=><th key={h} style={{textAlign:'left',fontSize:10,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 12px'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(o=>(
              <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <td style={{padding:'10px 12px',fontSize:13,color:C.text}}>{dealName(o.deal_id)}</td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.textMuted}}>{o.broker_email}</td>
                <td style={{padding:'10px 12px',fontSize:12,fontFamily:'ui-monospace,monospace',color:C.text}}>{fmtDate(o.sent_at)}</td>
                <td style={{padding:'10px 12px'}}><Badge color={o.status==='replied'?'green':o.status==='sent'?'amber':'gray'}>{o.status.replace('_',' ')}</Badge></td>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={4}><EmptyState icon={Mail} text="No outreach logged yet."/></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogOutreachModal({deals,properties,onClose,onSend,loading}){
  const [dealId,setDealId]=useState(deals.filter(d=>d.status!=='closed')[0]?.id||'');
  const deal=deals.find(d=>d.id===dealId);
  const list=deal?properties.filter(p=>p.property_type===deal.property_type):[];
  const [propId,setPropId]=useState(list[0]?.id||'');
  const selected=properties.find(p=>p.id===propId);
  return(
    <Modal title="Log outreach" onClose={onClose}>
      <Field label="Deal"><Select value={dealId} onChange={e=>{setDealId(e.target.value);setPropId('');}}>
        {deals.filter(d=>d.status!=='closed').map(d=><option key={d.id} value={d.id}>{d.client_name} — {d.property_type}</option>)}
      </Select></Field>
      <Field label="Property"><Select value={propId} onChange={e=>setPropId(e.target.value)}>
        <option value="">Select a property</option>
        {list.map(p=><option key={p.id} value={p.id}>{p.address}, {p.city} {p.state}</option>)}
      </Select></Field>
      {selected&&<Field label="Broker email"><Input value={selected.broker_email} readOnly style={{background:C.bgAlt}}/></Field>}
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!deal||!selected||loading} onClick={()=>onSend(deal,selected)}><Send size={13}/> {loading?'Sending...':'Send'}</Btn>
      </div>
    </Modal>
  );
}

function ReportsPage({deals}){
  const statusData=useMemo(()=>{
    const g={critical:0,urgent:0,on_track:0,closed:0};
    deals.forEach(d=>{g[getDealUrgency(d).key]++;});
    return [{name:'Critical',value:g.critical,color:'#DC2626'},{name:'Urgent',value:g.urgent,color:'#D97706'},{name:'On track',value:g.on_track,color:'#16A34A'},{name:'Closed',value:g.closed,color:'#A8A29E'}].filter(g=>g.value>0);
  },[deals]);
  const closed=deals.filter(d=>d.status==='closed');
  const winRate=deals.length?Math.round((closed.length/deals.length)*100):0;
  const pipeline=deals.filter(d=>d.status!=='closed').reduce((s,d)=>s+d.sale_amount,0);
  return(
    <div>
      <h1 style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:16}}>Reports</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        <MetricCard label="Total deals" value={deals.length}/>
        <MetricCard label="Closed deals" value={closed.length} color="green"/>
        <MetricCard label="Win rate" value={winRate+'%'} color="green"/>
        <MetricCard label="Pipeline value" value={fmtShort(pipeline)}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
          <h2 style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Deals by status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
              {statusData.map((s,i)=><Cell key={i} fill={s.color}/>)}
            </Pie><RTooltip contentStyle={{fontSize:12,borderRadius:6}}/><Legend wrapperStyle={{fontSize:12}}/></PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
          <h2 style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Deal stats</h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['Total pipeline value',fmtMoney(pipeline)],['Closed deal volume',fmtMoney(closed.reduce((s,d)=>s+d.sale_amount,0))],['Active deals',deals.filter(d=>d.status!=='closed').length],['Closed deals',closed.length]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                <span style={{color:C.textMuted}}>{l}</span><span style={{fontFamily:'ui-monospace,monospace',fontWeight:500,color:C.text}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeadlinesPage({deals}){
  const rows=useMemo(()=>deals.filter(d=>d.status!=='closed').map(d=>({d,u:getDealUrgency(d)})).sort((a,b)=>a.u.daysLeft-b.u.daysLeft),[deals]);
  return(
    <div>
      <h1 style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:16}}>Deadlines</h1>
      <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'ui-monospace,monospace'}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {['Client','Property','Deadline','Date','Days left','Value'].map(h=><th key={h} style={{textAlign:'left',fontSize:10,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',padding:'8px 12px',fontFamily:'Inter,sans-serif'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({d,u})=>(
              <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`,background:u.color==='red'?'#FEF2F2':u.color==='amber'?'#FFFBEB':'transparent'}}>
                <td style={{padding:'10px 12px',fontSize:13,fontFamily:'Inter,sans-serif',color:C.text}}>{d.client_name}</td>
                <td style={{padding:'10px 12px',fontSize:11,fontFamily:'Inter,sans-serif',color:C.textMuted}}>{d.property_address}</td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.text}}>{u.deadlineLabel}</td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.text}}>{fmtDate(u.deadlineDate)}</td>
                <td style={{padding:'10px 12px',fontSize:13,fontWeight:600,color:u.color==='red'?'#DC2626':u.color==='amber'?'#D97706':'#16A34A'}}>{u.daysLeft}d</td>
                <td style={{padding:'10px 12px',fontSize:12,color:C.text}}>{fmtMoney(d.sale_amount)}</td>
              </tr>
            ))}
            {rows.length===0&&<tr><td colSpan={6} style={{fontFamily:'Inter,sans-serif'}}><EmptyState icon={CalendarClock} text="No upcoming deadlines."/></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CSVUploadPage({onImportDeals,onImportProperties}){
  const [mode,setMode]=useState('deals');
  const [parsed,setParsed]=useState(null);
  const [drag,setDrag]=useState(false);
  const [summary,setSummary]=useState(null);
  const FIELDS={deals:['client_name','client_email','client_phone','sale_date','sale_amount','property_type','property_address'],properties:['address','city','state','price','cap_rate','property_type','broker_name','broker_email','broker_phone']};
  const handleFile=file=>{if(!file)return;Papa.parse(file,{header:true,skipEmptyLines:true,dynamicTyping:true,complete:res=>{const headers=(res.meta.fields||[]).map(h=>h.trim());const mapping={};headers.forEach(h=>{const n=h.toLowerCase().replace(/[\s_-]/g,'');const m=FIELDS[mode].find(f=>f.toLowerCase().replace(/[\s_-]/g,'')===n||n.includes(f.toLowerCase().replace(/[\s_-]/g,'').slice(0,5)));mapping[h]=m||null;});setParsed({headers,rows:res.data,mapping});setSummary(null);}});};
  const doImport=()=>{let ok=0,fail=0;const items=parsed.rows.map(row=>{const out={};parsed.headers.forEach(h=>{if(parsed.mapping[h])out[parsed.mapping[h]]=row[h];});return out;}).filter(it=>{const v=mode==='deals'?(it.client_name&&it.sale_amount):(it.address&&it.price);v?ok++:fail++;return v;});if(mode==='deals')onImportDeals(items);else onImportProperties(items);setSummary({ok,fail});setParsed(null);};
  return(
    <div>
      <h1 style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:16}}>CSV Upload</h1>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <Btn variant={mode==='deals'?'primary':'ghost'} onClick={()=>{setMode('deals');setParsed(null);setSummary(null);}}>Deals</Btn>
        <Btn variant={mode==='properties'?'primary':'ghost'} onClick={()=>{setMode('properties');setParsed(null);setSummary(null);}}>Properties</Btn>
      </div>
      {!parsed&&(<div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}} style={{border:`2px dashed ${drag?'#16A34A':C.border}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'56px 0',background:drag?'#F0FDF4':'#fff',transition:'all 0.15s'}}>
        <Upload size={28} style={{marginBottom:12,color:C.textMuted}}/><p style={{fontSize:13,color:C.text,marginBottom:8}}>Drag & drop a {mode} CSV here</p>
        <label style={{fontSize:13,fontWeight:500,color:'#15803D',cursor:'pointer',textDecoration:'underline'}}>or browse files<input type="file" accept=".csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/></label>
        <p style={{fontSize:11,color:C.textMuted,marginTop:12}}>Expected: {FIELDS[mode].join(', ')}</p>
      </div>)}
      {parsed&&(<div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
        <h3 style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Preview — {parsed.rows.length} rows</h3>
        <div style={{overflowX:'auto',marginBottom:12,border:`1px solid ${C.border}`,borderRadius:6}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{parsed.headers.map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',color:C.textMuted}}>{h}</th>)}</tr></thead>
            <tbody>{parsed.rows.slice(0,4).map((r,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>{parsed.headers.map(h=><td key={h} style={{padding:'6px 8px',color:C.text}}>{String(r[h]??'')}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={()=>setParsed(null)}>Cancel</Btn><Btn onClick={doImport}><Upload size={13}/> Import {parsed.rows.length} rows</Btn></div>
      </div>)}
      {summary&&(<div style={{marginTop:16,background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16,display:'flex',alignItems:'center',gap:10}}>
        <CheckCircle2 size={18} style={{color:'#16A34A'}}/><p style={{fontSize:13,color:C.text}}>Imported {summary.ok} rows{summary.fail>0?`, skipped ${summary.fail}`:''}</p>
      </div>)}
    </div>
  );
}

function InsightsPage({deals,outreach,settings}){
  const timeSaved=useMemo(()=>deals.reduce((s,d)=>s+(d.properties_matched_count||0)*2,0)+outreach.length*0.5+deals.length,[deals,outreach]);
  const moneySaved=timeSaved*(settings.hourly_rate||150);
  const closed=deals.filter(d=>d.status==='closed');
  const closedVol=closed.reduce((s,d)=>s+d.sale_amount,0);
  const feeRev=closedVol*((settings.fee_percent||1)/100);
  const net=moneySaved+feeRev-(settings.subscription_cost||500);
  const months=useMemo(()=>{const now=new Date();return Array.from({length:12},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+i,1);const label=d.toLocaleDateString('en-US',{month:'short',year:'2-digit'});const inM=deals.filter(dl=>{const sd=new Date(dl.created_at);return sd.getFullYear()===d.getFullYear()&&sd.getMonth()===d.getMonth();});return{month:label,count:inM.length,value:inM.reduce((s,d)=>s+d.sale_amount,0)};});},[deals]);
  return(
    <div>
      <h1 style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:4}}>Insights</h1>
      <p style={{fontSize:12,color:C.textMuted,marginBottom:16}}>Your ROI from automating exchange tracking, property matching, and broker outreach.</p>
      <div style={{background:'#fff',border:'2px solid #16A34A',borderRadius:8,padding:20,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:500,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Net value generated</div>
        <div style={{fontFamily:'ui-monospace,monospace',fontSize:28,fontWeight:700,color:'#16A34A'}}>{fmtMoney(net)}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        <MetricCard label="Time saved" value={Math.round(timeSaved)+'hrs'} sub="vs manual tracking"/>
        <MetricCard label="Money saved" value={fmtShort(moneySaved)} sub={`@ $${settings.hourly_rate||150}/hr`}/>
        <MetricCard label="Fee revenue" value={fmtShort(feeRev)} sub={`${settings.fee_percent||1}% on ${fmtShort(closedVol)} closed`}/>
      </div>
      <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
        <h2 style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>Pipeline value — 12 months</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={months}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="month" tick={{fontSize:11,fill:C.textMuted}} axisLine={{stroke:C.border}} tickLine={false}/>
            <YAxis tickFormatter={fmtShort} tick={{fontSize:11,fill:C.textMuted}} axisLine={false} tickLine={false}/>
            <RTooltip formatter={v=>fmtMoney(v)} contentStyle={{fontSize:12,borderRadius:6}}/>
            <Bar dataKey="value" name="Pipeline $" fill="#16A34A" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SettingsPage({settings,onUpdate,onConfirm,onToast,security}){
  const [form,setForm]=useState({...settings,webhook_outgoing:settings.webhook_outgoing||''});
  const [newKeyName,setNewKeyName]=useState('');
  const [apiKeys,setApiKeys]=useState([]);
  const [revealKey,setRevealKey]=useState(null);
  const [testingWH,setTestingWH]=useState(false);
  const [keysLoading,setKeysLoading]=useState(true);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  useEffect(()=>{
    supabase.from('wb_api_keys').select('*').order('created_at',{ascending:false}).then(({data})=>{setApiKeys(data||[]);setKeysLoading(false);});
  },[]);

  const saveSettings=async()=>{
    await supabase.from('wb_settings').upsert({...form,updated_at:new Date().toISOString()},{onConflict:'id'});
    onUpdate(form); onToast('Settings saved');
  };

  const genKey=async()=>{
    if(!newKeyName.trim()) return;
    const raw='wb_live_'+Array.from({length:32},()=>'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('');
    const hash=btoa(raw);
    const {data}=await supabase.from('wb_api_keys').insert({name:newKeyName,key_hash:hash,last4:raw.slice(-4)}).select().single();
    if(data){setApiKeys(k=>[data,...k]);setRevealKey(raw);setNewKeyName('');onToast('API key created');}
  };

  const revokeKey=async(id)=>{
    await supabase.from('wb_api_keys').update({revoked:true,revoked_at:new Date().toISOString()}).eq('id',id);
    setApiKeys(k=>k.map(k2=>k2.id===id?{...k2,revoked:true}:k2));
    onToast('API key revoked','error');
  };

  const testWebhook=async()=>{
    if(!form.webhook_outgoing){onToast('Add an outgoing webhook URL first','error');return;}
    setTestingWH(true);
    try{
      await fetch(form.webhook_outgoing,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'test',source:'WealthBuilder1031',timestamp:new Date().toISOString(),payload:{deal_id:'test',client_name:'Test Client',status:'active'}})});
      onToast('Test payload sent');
    }catch{onToast('Webhook test failed — check URL','error');}
    setTestingWH(false);
  };

  const incomingURL=`${N8N_BASE}/1031-deal-intake`;

  return(
    <div style={{maxWidth:700}}>
      <h1 style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:16}}>Settings</h1>
      <Section title="Account">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Field label="Name"><Input value={form.user_name||''} onChange={set('user_name')}/></Field>
          <Field label="Email"><Input value={form.user_email||''} onChange={set('user_email')}/></Field>
        </div>
        <Btn size="sm" onClick={saveSettings}>Save account</Btn>
      </Section>

      <Section title="Insights configuration" subtitle="Used to calculate your ROI on the Insights page.">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <Field label="Hourly rate ($)"><Input type="number" value={form.hourly_rate||150} onChange={e=>setForm(f=>({...f,hourly_rate:Number(e.target.value)}))} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
          <Field label="QI fee %"><Input type="number" step="0.1" value={form.fee_percent||1} onChange={e=>setForm(f=>({...f,fee_percent:Number(e.target.value)}))} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
          <Field label="Subscription cost/mo ($)"><Input type="number" value={form.subscription_cost||500} onChange={e=>setForm(f=>({...f,subscription_cost:Number(e.target.value)}))} style={{fontFamily:'ui-monospace,monospace'}}/></Field>
        </div>
        <Btn size="sm" onClick={saveSettings}>Save</Btn>
      </Section>

      <Section title="API Keys" subtitle="Generate keys so GoHighLevel, HubSpot, or any CRM can authenticate requests to this system.">
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <Input value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="Key name (e.g. GoHighLevel)" style={{flex:1}}/>
          <Btn onClick={genKey}><KeyRound size={13}/> Generate</Btn>
        </div>
        {keysLoading?<div style={{fontSize:12,color:C.textMuted}}>Loading keys...</div>:(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {apiKeys.map(k=>(
              <div key={k.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 12px'}}>
                <div>
                  <div style={{fontSize:13,color:C.text}}>{k.name}</div>
                  <div style={{fontSize:11,fontFamily:'ui-monospace,monospace',color:C.textMuted}}>wb_live_••••••••{k.last4} · {fmtDate(k.created_at)}</div>
                </div>
                {k.revoked?<Badge color="red">Revoked</Badge>:<Btn size="sm" variant="ghost" onClick={()=>onConfirm({title:'Revoke API key?',message:`"${k.name}" will stop working immediately.`,danger:true,confirmLabel:'Revoke',onConfirm:()=>revokeKey(k.id)})}>Revoke</Btn>}
              </div>
            ))}
            {apiKeys.length===0&&<p style={{fontSize:12,color:C.textMuted}}>No API keys yet.</p>}
          </div>
        )}
      </Section>

      <Section title="Webhooks" subtitle="Connect this system to any CRM using standard REST webhooks.">
        <Field label="Incoming webhook URL" hint="POST new deals to this URL from any CRM. Authenticated via API key header: x-api-key: wb_live_...">
          <div style={{display:'flex',gap:8}}>
            <Input value={incomingURL} readOnly style={{background:C.bgAlt,fontFamily:'ui-monospace,monospace',fontSize:11,flex:1}}/>
            <Btn size="sm" variant="ghost" onClick={()=>{navigator.clipboard?.writeText(incomingURL);onToast('Copied');}}><Copy size={13}/></Btn>
          </div>
        </Field>
        <Field label="Example payload" hint="Send this JSON to the incoming webhook to create a deal:">
          <pre style={{background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 12px',fontSize:11,fontFamily:'ui-monospace,monospace',color:C.text,overflowX:'auto'}}>{JSON.stringify({api_key:'wb_live_...',client_name:'Jane Doe',client_email:'jane@example.com',sale_date:'2026-06-01',sale_amount:2500000,property_type:'Retail',property_address:'123 Main St, Austin TX'},null,2)}</pre>
        </Field>
        <Field label="Outgoing webhook URL" hint="We POST deal events here whenever a deal is created, matched, or status changes. Use this to sync to GHL, HubSpot, or n8n.">
          <Input value={form.webhook_outgoing} onChange={set('webhook_outgoing')} placeholder="https://your-crm.com/webhooks/wealthbuilder" style={{fontFamily:'ui-monospace,monospace',fontSize:11}}/>
        </Field>
        <Field label="Events sent" hint="Deal created · Property matched · Outreach sent · Status changed"/>
        <div style={{display:'flex',gap:8}}>
          <Btn size="sm" onClick={saveSettings}>Save</Btn>
          <Btn size="sm" variant="ghost" onClick={testWebhook} disabled={testingWH}>{testingWH?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Webhook size={13}/>} Test webhook</Btn>
        </div>
      </Section>

      <Section title="Security log">
        <div style={{border:`1px solid ${C.border}`,borderRadius:6,overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
              {['Time','IP','Device','Result'].map(h=><th key={h} style={{textAlign:'left',padding:'7px 12px',fontSize:10,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {security.map(s=>(
                <tr key={s.id} style={{borderBottom:`1px solid ${C.border}`,background:s.success?'transparent':'#FEF2F2'}}>
                  <td style={{padding:'8px 12px',fontFamily:'ui-monospace,monospace',fontSize:11,color:C.text}}>{fmtDate(s.timestamp)}</td>
                  <td style={{padding:'8px 12px',fontFamily:'ui-monospace,monospace',fontSize:11,color:C.text}}>{s.ip}</td>
                  <td style={{padding:'8px 12px',fontSize:12,color:C.textMuted}}>{s.device}</td>
                  <td style={{padding:'8px 12px'}}><Badge color={s.success?'green':'red'}>{s.success?'Success':'Failed'}</Badge></td>
                </tr>
              ))}
              {security.length===0&&<tr><td colSpan={4} style={{padding:'24px',textAlign:'center',fontSize:12,color:C.textMuted}}>No login activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Notifications">
        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,fontSize:13,color:C.text,cursor:'pointer'}}>
          <input type="checkbox" checked={form.notif_email_deadlines||false} onChange={e=>setForm(f=>({...f,notif_email_deadlines:e.target.checked}))}/> Email alerts for upcoming deadlines
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,fontSize:13,color:C.text,cursor:'pointer'}}>
          <input type="checkbox" checked={form.notif_failed_login||false} onChange={e=>setForm(f=>({...f,notif_failed_login:e.target.checked}))}/> Email alerts for failed login attempts
        </label>
        <Btn size="sm" onClick={saveSettings}>Save</Btn>
      </Section>

      {revealKey&&(
        <Modal title="API key created" onClose={()=>setRevealKey(null)} width="460px">
          <p style={{fontSize:12,color:C.textMuted,marginBottom:8}}>Copy this key now — you won't see it again.</p>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <Input value={revealKey} readOnly style={{fontFamily:'ui-monospace,monospace',fontSize:12}}/>
            <Btn size="sm" variant="ghost" onClick={()=>{navigator.clipboard?.writeText(revealKey);onToast('Copied');}}><Copy size={13}/></Btn>
          </div>
          <Btn onClick={()=>setRevealKey(null)}>Done</Btn>
        </Modal>
      )}
    </div>
  );
}

/* ── Main Dashboard Component ── */
export default function Dashboard({session}){
  const [page,setPage]=useState('dashboard');
  const [loading,setLoading]=useState(true);
  const [deals,setDeals]=useState([]);
  const [properties,setProperties]=useState([]);
  const [outreach,setOutreach]=useState([]);
  const [settings,setSettings]=useState({hourly_rate:150,fee_percent:1,subscription_cost:500,webhook_outgoing:'',notif_email_deadlines:true,notif_failed_login:true});
  const [security]=useState([{id:'1',timestamp:new Date().toISOString(),ip:'—',device:'Current session',success:true}]);
  const [now,setNow]=useState(new Date());
  const [collapsed,setCollapsed]=useState(false);
  const [toasts,setToasts]=useState([]);
  const [confirmState,setConfirmState]=useState(null);
  const [actionLoading,setActionLoading]=useState({});

  const [drawerDeal,setDrawerDeal]=useState(null);
  const [matchDeal,setMatchDeal]=useState(null);
  const [outreachDeal,setOutreachDeal]=useState(null);
  const [showNewDeal,setShowNewDeal]=useState(false);
  const [propModal,setPropModal]=useState(null);
  const [showLogOutreach,setShowLogOutreach]=useState(false);

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{const r=()=>setCollapsed(window.innerWidth<900);r();window.addEventListener('resize',r);return()=>window.removeEventListener('resize',r);},[]);

  const toast=(msg,type='success')=>{const id=genId();setToasts(t=>[...t,{id,msg,type}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);};
  const confirm=cfg=>setConfirmState(cfg);

  // Load all data from Supabase
  const loadAll=useCallback(async()=>{
    setLoading(true);
    const [r1,r2,r3,r4]=await Promise.all([
      supabase.from('ex_deals').select('*').order('created_at',{ascending:false}),
      supabase.from('ex_properties').select('*').order('created_at',{ascending:false}),
      supabase.from('ex_broker_outreach').select('*').order('sent_at',{ascending:false}),
      supabase.from('wb_settings').select('*').single(),
    ]);
    setDeals(r1.data||[]);
    setProperties(r2.data||[]);
    setOutreach(r3.data||[]);
    if(r4.data) setSettings(r4.data);
    setLoading(false);
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

  // Outgoing webhook helper
  const fireWebhook=useCallback(async(event,payload)=>{
    if(!settings.webhook_outgoing) return;
    try{
      fetch(settings.webhook_outgoing,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,source:'WealthBuilder1031',timestamp:new Date().toISOString(),payload})});
    }catch{}
  },[settings.webhook_outgoing]);

  /* deal CRUD */
  const createDeal=async(f)=>{
    const sale=new Date(f.sale_date);
    const deal={client_name:f.client_name,client_email:f.client_email,client_phone:f.client_phone,sale_date:sale.toISOString(),sale_amount:f.sale_amount,property_sold_type:f.property_type,property_sold_address:f.property_address,deadline_45:addDays(sale,45).toISOString().split('T')[0],deadline_180:addDays(sale,180).toISOString().split('T')[0],status:'active',properties_matched:0};
    const {data,error}=await supabase.from('ex_deals').insert(deal).select().single();
    if(error){toast(error.message,'error');return;}
    setDeals(d=>[data,...d]);
    setShowNewDeal(false);
    toast('Deal created');
    await fireWebhook('deal.created',data);
  };

  const updateDeal=async(id,patch)=>{
    const{error}=await supabase.from('ex_deals').update(patch).eq('id',id);
    if(error){toast(error.message,'error');return;}
    setDeals(d=>d.map(x=>x.id===id?{...x,...patch}:x));
    setDrawerDeal(null);
    toast('Deal updated');
    await fireWebhook('deal.updated',{id,...patch});
  };

  const deleteDeal=async(id)=>{
    await supabase.from('ex_broker_outreach').delete().eq('deal_id',id);
    await supabase.from('ex_property_matches').delete().eq('deal_id',id).catch(()=>{});
    await supabase.from('ex_deals').delete().eq('id',id);
    setDeals(d=>d.filter(x=>x.id!==id));
    toast('Deal deleted','error');
    await fireWebhook('deal.deleted',{id});
  };

  const markMatched=async(deal,prop)=>{
    const key=`match-${deal.id}`;
    setActionLoading(a=>({...a,[key]:true}));
    const newCount=(deal.properties_matched||deal.properties_matched_count||0)+1;
    await supabase.from('ex_deals').update({properties_matched:newCount}).eq('id',deal.id);
    setDeals(d=>d.map(x=>x.id===deal.id?{...x,properties_matched:newCount,properties_matched_count:newCount}:x));
    setMatchDeal(null);
    toast('Property marked as matched');
    await fireWebhook('property.matched',{deal_id:deal.id,property_id:prop.id,broker_email:prop.broker_email});
    setActionLoading(a=>({...a,[key]:false}));
  };

  const sendOutreach=async(deal,prop)=>{
    const key=`out-${deal.id}`;
    setActionLoading(a=>({...a,[key]:true}));
    const entry={deal_id:deal.id,property_id:prop.id,broker_email:prop.broker_email,sent_at:new Date().toISOString(),status:'sent'};
    const{data,error}=await supabase.from('ex_broker_outreach').insert(entry).select().single();
    if(error){toast(error.message,'error');setActionLoading(a=>({...a,[key]:false}));return;}

    // Trigger n8n outreach workflow
    try{
      await fetch(`${N8N_BASE}/1031-broker-outreach`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deal_id:deal.id,target_state:'TX',target_property_type:deal.property_sold_type||deal.property_type||'retail',max_budget:deal.sale_amount,client_name:deal.client_name,client_email:deal.client_email})});
    }catch{}

    setOutreach(o=>[data,...o]);
    setOutreachDeal(null);
    setShowLogOutreach(false);
    toast('Outreach sent');
    await fireWebhook('outreach.sent',{deal_id:deal.id,broker_email:prop.broker_email});
    setActionLoading(a=>({...a,[key]:false}));
  };

  /* property CRUD */
  const saveProperty=async(data)=>{
    if(propModal?.mode==='edit'){
      const{error}=await supabase.from('ex_properties').update(data).eq('id',data.id);
      if(error){toast(error.message,'error');return;}
      setProperties(p=>p.map(x=>x.id===data.id?data:x));
      toast('Property updated');
    }else{
      const{data:nd,error}=await supabase.from('ex_properties').insert(data).select().single();
      if(error){toast(error.message,'error');return;}
      setProperties(p=>[nd,...p]);
      toast('Property added');
    }
    setPropModal(null);
  };
  const deleteProperty=async(id)=>{
    await supabase.from('ex_properties').delete().eq('id',id);
    setProperties(p=>p.filter(x=>x.id!==id));
    toast('Property deleted','error');
  };

  /* csv import */
  const importDeals=async(items)=>{
    const built=items.map(it=>{const s=it.sale_date?new Date(it.sale_date):new Date();return{client_name:it.client_name||'Unknown',client_email:it.client_email||'',client_phone:it.client_phone||'',sale_date:s.toISOString(),sale_amount:Number(it.sale_amount)||0,property_sold_type:it.property_type||'Retail',property_sold_address:it.property_address||'',deadline_45:addDays(s,45).toISOString().split('T')[0],deadline_180:addDays(s,180).toISOString().split('T')[0],status:'active',properties_matched:0};});
    const{data,error}=await supabase.from('ex_deals').insert(built).select();
    if(error){toast(error.message,'error');return;}
    setDeals(d=>[...(data||[]),...d]);
    toast(`Imported ${(data||[]).length} deals`);
  };
  const importProperties=async(items)=>{
    const built=items.map(it=>({address:it.address||'',city:it.city||'',state:it.state||'',price:Number(it.price)||0,cap_rate:Number(it.cap_rate)||0,property_type:it.property_type||'Retail',broker_name:it.broker_name||'',broker_email:it.broker_email||'',broker_phone:it.broker_phone||'',noi:Math.round((Number(it.price)||0)*((Number(it.cap_rate)||0)/100))}));
    const{data,error}=await supabase.from('ex_properties').insert(built).select();
    if(error){toast(error.message,'error');return;}
    setProperties(p=>[...(data||[]),...p]);
    toast(`Imported ${(data||[]).length} properties`);
  };

  const signOut=async()=>{await supabase.auth.signOut();};

  if(loading) return(
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bgAlt}}>
      <Loader2 size={24} style={{animation:'spin 1s linear infinite',color:'#16A34A'}}/>
    </div>
  );

  const dealProps={properties,outreach};

  return(
    <div style={{display:'flex',height:'100vh',width:'100%',overflow:'hidden',fontFamily:"'Inter',system-ui,sans-serif",background:C.bgAlt}}>
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} now={now}
        onLogout={()=>confirm({title:'Sign out?',message:'Are you sure?',confirmLabel:'Sign out',onConfirm:signOut})}/>
      <main style={{flex:1,overflowY:'auto',padding:24}}>
        {page==='dashboard'&&<DashboardPage deals={deals} {...dealProps} nav={setPage} onRowClick={setDrawerDeal} onMatch={setMatchDeal} onOutreach={setOutreachDeal} onDeleteDeal={d=>confirm({title:'Delete deal?',message:`Permanently delete ${d.client_name}'s deal?`,danger:true,confirmLabel:'Delete',onConfirm:()=>deleteDeal(d.id)})} onNewDeal={()=>setShowNewDeal(true)} actionLoading={actionLoading}/>}
        {page==='deals'&&<DealsPage deals={deals} onRowClick={setDrawerDeal} onMatch={setMatchDeal} onOutreach={setOutreachDeal} onDelete={d=>confirm({title:'Delete deal?',message:`Permanently delete ${d.client_name}'s deal?`,danger:true,confirmLabel:'Delete',onConfirm:()=>deleteDeal(d.id)})} onNewDeal={()=>setShowNewDeal(true)}/>}
        {page==='properties'&&<PropertiesPage properties={properties} onNew={()=>setPropModal({mode:'new',data:null})} onEdit={p=>setPropModal({mode:'edit',data:p})} onDelete={p=>confirm({title:'Delete property?',message:`Remove ${p.address}?`,danger:true,confirmLabel:'Delete',onConfirm:()=>deleteProperty(p.id)})}/>}
        {page==='outreach'&&<OutreachPage outreach={outreach} deals={deals} onLogNew={()=>setShowLogOutreach(true)}/>}
        {page==='reports'&&<ReportsPage deals={deals}/>}
        {page==='deadlines'&&<DeadlinesPage deals={deals}/>}
        {page==='csv'&&<CSVUploadPage onImportDeals={importDeals} onImportProperties={importProperties}/>}
        {page==='insights'&&<InsightsPage deals={deals} outreach={outreach} settings={settings}/>}
        {page==='settings'&&<SettingsPage settings={settings} onUpdate={setSettings} onConfirm={confirm} onToast={toast} security={security}/>}
      </main>

      {drawerDeal&&<DealDrawer deal={drawerDeal} {...dealProps} onClose={()=>setDrawerDeal(null)} onSave={updateDeal}/>}
      {matchDeal&&<MatchModal deal={matchDeal} properties={properties} onClose={()=>setMatchDeal(null)} onMatch={markMatched} loading={!!actionLoading[`match-${matchDeal?.id}`]}/>}
      {outreachDeal&&<OutreachModal deal={outreachDeal} properties={properties} onClose={()=>setOutreachDeal(null)} onSend={sendOutreach} loading={!!actionLoading[`out-${outreachDeal?.id}`]}/>}
      {showNewDeal&&<NewDealModal onClose={()=>setShowNewDeal(false)} onCreate={createDeal}/>}
      {showLogOutreach&&<LogOutreachModal deals={deals} properties={properties} onClose={()=>setShowLogOutreach(false)} onSend={sendOutreach} loading={false}/>}
      {propModal&&<PropertyModal mode={propModal.mode} data={propModal.data} onClose={()=>setPropModal(null)} onSave={saveProperty}/>}
      <Confirm state={confirmState} onCancel={()=>setConfirmState(null)}/>
      <Toasts toasts={toasts}/>
    </div>
  );
}
