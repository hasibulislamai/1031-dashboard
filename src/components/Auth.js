import { useState } from 'react';
import { supabase } from '../supabase';
import { C } from './shared';

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
    wrap: { display: 'flex', height: '100vh', background: '#F7F7F5', fontFamily: "'Inter',system-ui,sans-serif" },
    left: { width: '45%', background: '#fff', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' },
    right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
    box: { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '32px 28px', width: 380 },
    tabs: { display: 'flex', gap: 0, marginBottom: 24, background: '#F7F7F5', borderRadius: 8, padding: 3 },
    tab: (a) => ({ flex: 1, textAlign: 'center', padding: '7px', borderRadius: 6, fontSize: 13, fontWeight: a ? 500 : 400, color: a ? C.text : C.textMuted, background: a ? '#fff' : 'transparent', cursor: 'pointer', border: a ? `1px solid ${C.border}` : '1px solid transparent' }),
    input: { width: '100%', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: C.text, fontSize: 14, outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box', marginBottom: 12 },
    btn: { width: '100%', padding: '10px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 },
    err: { background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 7, padding: '8px 12px', color: '#DC2626', fontSize: 12, marginTop: 8 },
    ok: { background: '#F0FDF4', border: `1px solid #BBF7D0`, borderRadius: 7, padding: '8px 12px', color: '#15803D', fontSize: 12, marginTop: 8 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.left}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: '#16A34A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>W</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>WealthBuilder 1031</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>AI-Powered Exchange Platform</div>
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: C.text, lineHeight: 1.3, marginBottom: 10 }}>
          The complete platform for 1031 exchange advisors.
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 20 }}>
          Automate deadline tracking, AI property matching, and broker outreach — all in one dashboard.
        </div>
        {[
          ['#16A34A', 'Automated 45/180-day deadline tracking'],
          ['#2563EB', 'AI-powered property matching'],
          ['#D97706', 'Automated broker outreach'],
          ['#7C3AED', 'White label for your brand'],
          ['#DC2626', 'CRM & webhook integrations'],
        ].map(([c, t], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: C.textMuted }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />{t}
          </div>
        ))}
        <div style={{ marginTop: 32, padding: 16, background: C.bgAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pricing</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['Basic', '$97/mo', '10 clients'], ['Pro', '$297/mo', '500 clients + White label'], ['Enterprise', '$997/mo', 'Unlimited']].map(([n, p, f]) => (
              <div key={n} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>{p}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{f}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={s.right}>
        {mode === 'forgot' ? (
          <div style={s.box}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>Reset password</div>
            <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={s.ok}>{success}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: C.textMuted }}>
              <span style={{ color: '#15803D', cursor: 'pointer' }} onClick={() => setMode('signin')}>← Back to sign in</span>
            </div>
          </div>
        ) : (
          <div style={s.box}>
            <div style={s.tabs}>
              <div style={s.tab(mode === 'signin')} onClick={() => setMode('signin')}>Sign in</div>
              <div style={s.tab(mode === 'signup')} onClick={() => setMode('signup')}>Create account</div>
            </div>
            <input style={s.input} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={s.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={s.ok}>{success}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')}</button>
            {mode === 'signin' && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: C.textMuted }}>
                <span style={{ color: '#15803D', cursor: 'pointer' }} onClick={() => setMode('forgot')}>Forgot password?</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
