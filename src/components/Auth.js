import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('basic');
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            plan: plan
          }
        }
      });
      if (error) {
        setError(error.message);
      } else {
        if (data && data.user) {
          await supabase.from('wb_tenants').insert({
            company_name: firstName + ' ' + lastName,
            owner_email: email,
            owner_name: firstName,
            last_name: lastName,
            phone: phone,
            plan: plan,
            status: 'active'
          });
        }
        setMessage('Account created! Check your email for a confirmation link to activate your account.');
      }
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

  const inputStyle = { width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'12px', color:'#fff', fontSize:'0.9rem', boxSizing:'border-box' };
  const labelStyle = { color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'6px' };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif', padding:'20px' }}>
      <div style={{ background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'40px', width:'440px', maxWidth:'90vw' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'1.5rem', fontWeight:'700', color:'#16A34A', marginBottom:'4px' }}>&#9889; WealthBuilder 1031</div>
          <div style={{ color:'#666', fontSize:'0.85rem' }}>The complete platform for 1031 exchange advisors</div>
        </div>

        <form onSubmit={handleAuth}>
          {isSignUp && (
            <>
              <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>FIRST NAME</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="John" style={inputStyle} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>LAST NAME</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Smith" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom:'16px' }}>
                <label style={labelStyle}>PHONE NUMBER</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+1 555 123 4567" style={inputStyle} />
              </div>
            </>
          )}

          <div style={{ marginBottom:'16px' }}>
            <label style={labelStyle}>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="advisor@company.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: isSignUp ? '16px' : '8px' }}>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" style={inputStyle} />
          </div>

          {isSignUp && (
            <div style={{ marginBottom:'20px' }}>
              <label style={labelStyle}>CHOOSE YOUR PLAN</label>
              <div style={{ display:'flex', gap:'12px' }}>
                <div onClick={() => setPlan('basic')}
                  style={{ flex:1, cursor:'pointer', background: plan==='basic' ? '#0a2a0a' : '#1a1a1a', border: plan==='basic' ? '2px solid #16A34A' : '1px solid #333', borderRadius:'10px', padding:'16px', textAlign:'center' }}>
                  <div style={{ color:'#fff', fontWeight:'600', fontSize:'1rem' }}>Basic</div>
                  <div style={{ color:'#16A34A', fontSize:'1.3rem', fontWeight:'700', margin:'4px 0' }}>$49<span style={{ fontSize:'0.75rem', color:'#666' }}>/mo</span></div>
                  <div style={{ color:'#888', fontSize:'0.7rem' }}>Up to 10 deals</div>
                </div>
                <div onClick={() => setPlan('pro')}
                  style={{ flex:1, cursor:'pointer', background: plan==='pro' ? '#0a2a0a' : '#1a1a1a', border: plan==='pro' ? '2px solid #16A34A' : '1px solid #333', borderRadius:'10px', padding:'16px', textAlign:'center', position:'relative' }}>
                  <div style={{ position:'absolute', top:'-10px', right:'10px', background:'#16A34A', color:'#fff', fontSize:'0.6rem', padding:'2px 8px', borderRadius:'10px', fontWeight:'600' }}>POPULAR</div>
                  <div style={{ color:'#fff', fontWeight:'600', fontSize:'1rem' }}>Pro</div>
                  <div style={{ color:'#16A34A', fontSize:'1.3rem', fontWeight:'700', margin:'4px 0' }}>$149<span style={{ fontSize:'0.75rem', color:'#666' }}>/mo</span></div>
                  <div style={{ color:'#888', fontSize:'0.7rem' }}>Unlimited deals</div>
                </div>
              </div>
            </div>
          )}

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
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }} style={{ background:'none', border:'none', color:'#16A34A', cursor:'pointer', fontSize:'0.85rem' }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
