import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email for confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email first'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) setError(error.message);
    else setMessage('Password reset email sent!');
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif' }}>
      <div style={{ background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'40px', width:'400px', maxWidth:'90vw' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'1.5rem', fontWeight:'700', color:'#16A34A', marginBottom:'4px' }}>⚡ WealthBuilder 1031</div>
          <div style={{ color:'#666', fontSize:'0.85rem' }}>The complete platform for 1031 exchange advisors</div>
        </div>

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'6px' }}>EMAIL ADDRESS</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="advisor@company.com"
              style={{ width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'12px', color:'#fff', fontSize:'0.9rem', boxSizing:'border-box' }}
            />
          </div>
          <div style={{ marginBottom:'8px' }}>
            <label style={{ color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'6px' }}>PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'12px', color:'#fff', fontSize:'0.9rem', boxSizing:'border-box' }}
            />
          </div>

          {!isSignUp && (
            <div style={{ textAlign:'right', marginBottom:'16px' }}>
              <button type="button" onClick={handleForgotPassword} style={{ background:'none', border:'none', color:'#16A34A', cursor:'pointer', fontSize:'0.8rem' }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div style={{ background:'#2a0a0a', border:'1px solid #f00', borderRadius:'8px', padding:'10px', color:'#ff4444', fontSize:'0.8rem', marginBottom:'16px' }}>{error}</div>}
          {message && <div style={{ background:'#0a2a0a', border:'1px solid #16A34A', borderRadius:'8px', padding:'10px', color:'#16A34A', fontSize:'0.8rem', marginBottom:'16px' }}>{message}</div>}

          <button type="submit" disabled={loading}
            style={{ width:'100%', background:'#16A34A', border:'none', borderRadius:'8px', padding:'14px', color:'#fff', fontWeight:'600', fontSize:'1rem', cursor:'pointer' }}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:'20px' }}>
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ background:'none', border:'none', color:'#16A34A', cursor:'pointer', fontSize:'0.85rem' }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
