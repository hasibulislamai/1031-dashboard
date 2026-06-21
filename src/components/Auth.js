import { useState } from 'react';
import { supabase } from '../supabase';

const C = { text: '#37352F', textMuted: '#787774', border: '#E9E9E7', bgAlt: '#F7F7F5' };

export default function Auth() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handle = async () => {
    setLoading(true); setError(''); setSuccess('');
    if (mode === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message);
    } else if (mode === 'signup') {
      const { error: e } = await supabase.auth.signUp({ email, password });
      if (e) setError(e.message);
      else setSuccess('Account created! Check your email to confirm.');
    } else {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (e) setError(e.message);
      else setSuccess('Password reset email sent!');
    }
    setLoading(false);
  };

  const s = {
    wrap: { display:'flex', height:'100vh', background:'#F7F7F5', fontFamily:"'Inter',system-ui,sans-serif" },
    left: { width:'45%', background:'#fff', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 48px' },
    right: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40 },
    logoWrap: { display:'flex', alignItems:'center', gap:10, marginBottom:40 },
    logoIcon: { width:36, height:36, background:'#16A34A', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:16 },
    heading: { fontSize:28, fontWeight:600, color:C.text, lineHeight:1.3, marginBottom:10 },
    sub: { fontSize:14, color:C.textMuted, lineHeight:1.7 },
    feature: { display:'flex', alignItems:'center', gap:8, marginTop:12, fontSize:13, color:C.textMuted },
    dot: (c) => ({ width:6, height:6, borderRadius:'50%', background:c, flexShrink:0 }),
    box: { background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:'32px 28px', width:380 },
    tabs: { display:'flex', gap:0, marginBottom:24, background:'#F7F7F5', borderRadius:8, padding:3 },
    tab: (a) => ({ flex:1, textAlign:'center', padding:'7px', borderRadius:6, fontSize:13, fontWeight:a?500:400, color:a?C.text:C.textMuted, background:a?'#fff':'transparent', cursor:'pointer', border:a?`1px solid ${C.border}`:'1px solid transparent', transition:'all 0.15s' }),
    label: { fontSize:12, color:C.textMuted, marginBottom:5, display:'block' },
    input: { width:'100%', background:'#fff', border:`1px solid ${C.border}`, borderRadius:7, padding:'9px 12px', color:C.text, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:12 },
    btn: { width:'100%', padding:'10px', background:'#16A34A', color:'#fff', border:'none', borderRadius:7, fontSize:14, fontWeight:500, cursor:'pointer', marginTop:4 },
    err: { background:'#FEF2F2', border:`1px solid #FECACA`, borderRadius:7, padding:'8px 12px', color:'#DC2626', fontSize:12, marginTop:8 },
    ok: { background:'#F0FDF4', border:`1px solid #BBF7D0`, borderRadius:7, padding:'8px 12px', color:'#15803D', fontSize:12, marginTop:8 },
    forgot: { textAlign:'center', marginTop:12, fontSize:12, color:C.textMuted },
    link: { color:'#15803D', cursor:'pointer', textDecoration:'underline' }
  };

  return (
    <div style={s.wrap}>
      <div style={s.left}>
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>W</div>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:C.text}}>WealthBuilder 1031</div>
            <div style={{fontSize:11,color:C.textMuted}}>Exchange Automation</div>
          </div>
        </div>
        <div style={s.heading}>AI-powered 1031 exchange automation.</div>
        <div style={s.sub}>Never miss a deadline. Match properties instantly. Reach brokers automatically.</div>
        {[['#16A34A','Automated deadline tracking'],['#2563EB','AI property matching'],['#D97706','Instant broker outreach'],['#7C3AED','CRM webhook integration']].map(([c,t],i)=>(
          <div key={i} style={s.feature}><div style={s.dot(c)}/>{t}</div>
        ))}
      </div>
      <div style={s.right}>
        {mode === 'forgot' ? (
          <div style={s.box}>
            <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:4}}>Reset password</div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:18}}>Enter your email to receive a reset link.</div>
            <label style={s.label}>Email address</label>
            <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={s.ok}>{success}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading?'Sending...':'Send reset link'}</button>
            <div style={s.forgot}><span style={s.link} onClick={()=>setMode('signin')}>← Back to sign in</span></div>
          </div>
        ) : (
          <div style={s.box}>
            <div style={s.tabs}>
              <div style={s.tab(mode==='signin')} onClick={()=>setMode('signin')}>Sign in</div>
              <div style={s.tab(mode==='signup')} onClick={()=>setMode('signup')}>Create account</div>
            </div>
            <label style={s.label}>Email address</label>
            <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()}/>
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={s.ok}>{success}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading?'Please wait...':(mode==='signin'?'Sign in':'Create account')}</button>
            {mode==='signin' && <div style={s.forgot}><span style={s.link} onClick={()=>setMode('forgot')}>Forgot password?</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}
