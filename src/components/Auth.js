import { useState } from 'react';
import { supabase } from '../supabase';

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
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (e) setError(e.message);
      else setSuccess('Password reset email sent!');
    }
    setLoading(false);
  };

  const s = {
    wrap: { display:'flex', height:'100vh', background:'#080808', fontFamily:"'Inter',sans-serif" },
    left: { width:'45%', background:'#0d0d0d', borderRight:'1px solid #1a1a1a', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 48px' },
    right: { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40 },
    logo: { display:'flex', alignItems:'center', gap:12, marginBottom:40 },
    logoIcon: { width:44, height:44, background:'#00e676', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 },
    heading: { fontSize:36, fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:12 },
    sub: { fontSize:15, color:'#555', lineHeight:1.6 },
    feature: { display:'flex', alignItems:'center', gap:10, marginTop:16, fontSize:13, color:'#666' },
    dot: (c) => ({ width:6, height:6, borderRadius:'50%', background:c }),
    box: { background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:16, padding:'36px 32px', width:400 },
    tabs: { display:'flex', gap:0, marginBottom:28, background:'#111', borderRadius:10, padding:4 },
    tab: (a) => ({ flex:1, textAlign:'center', padding:'8px', borderRadius:8, fontSize:13, fontWeight: a?600:400, color: a?'#000':'#555', background: a?'#00e676':'transparent', cursor:'pointer', transition:'all 0.15s' }),
    label: { fontSize:12, color:'#666', marginBottom:6 },
    input: { width:'100%', background:'#111', border:'1px solid #222', borderRadius:9, padding:'11px 14px', color:'#e0e0e0', fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', marginBottom:14 },
    btn: { width:'100%', padding:'12px', background:'#00e676', color:'#000', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4 },
    err: { background:'#1a0808', border:'1px solid #3a1414', borderRadius:8, padding:'10px 14px', color:'#ff5252', fontSize:12, marginTop:10 },
    ok: { background:'#0a1f0a', border:'1px solid #1a3a1a', borderRadius:8, padding:'10px 14px', color:'#00e676', fontSize:12, marginTop:10 },
    forgot: { textAlign:'center', marginTop:14, fontSize:12, color:'#555', cursor:'pointer' },
    forgotLink: { color:'#2979ff', cursor:'pointer' }
  };

  return (
    <div style={s.wrap}>
      <div style={s.left}>
        <div style={s.logo}>
          <div style={s.logoIcon}>🏛</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>WealthBuilder 1031</div>
            <div style={{fontSize:11,color:'#444'}}>Exchange Automation</div>
          </div>
        </div>
        <div style={s.heading}>AI-powered 1031 exchange automation.</div>
        <div style={s.sub}>Never miss a deadline. Match properties instantly. Reach brokers automatically.</div>
        <div style={s.feature}><div style={s.dot('#00e676')} /> Automated deadline tracking</div>
        <div style={s.feature}><div style={s.dot('#2979ff')} /> AI property matching</div>
        <div style={s.feature}><div style={s.dot('#ff9800')} /> Instant broker outreach</div>
        <div style={s.feature}><div style={s.dot('#e040fb')} /> Real-time deal dashboard</div>
      </div>
      <div style={s.right}>
        {mode === 'forgot' ? (
          <div style={s.box}>
            <div style={{fontSize:18,fontWeight:600,color:'#fff',marginBottom:6}}>Reset password</div>
            <div style={{fontSize:12,color:'#555',marginBottom:20}}>Enter your email to receive a reset link.</div>
            <div style={s.label}>Email address</div>
            <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={s.ok}>{success}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading?'Sending...':'Send reset link'}</button>
            <div style={s.forgot}><span style={s.forgotLink} onClick={()=>setMode('signin')}>← Back to sign in</span></div>
          </div>
        ) : (
          <div style={s.box}>
            <div style={s.tabs}>
              <div style={s.tab(mode==='signin')} onClick={()=>setMode('signin')}>Sign in</div>
              <div style={s.tab(mode==='signup')} onClick={()=>setMode('signup')}>Create account</div>
            </div>
            <div style={s.label}>Email address</div>
            <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            <div style={s.label}>Password</div>
            <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} />
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={s.ok}>{success}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading?'Please wait...':(mode==='signin'?'Sign in':'Create account')}</button>
            {mode==='signin' && <div style={s.forgot}><span style={s.forgotLink} onClick={()=>setMode('forgot')}>Forgot password?</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}
