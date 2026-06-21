import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const clearMessages = () => { setMessage(null); setError(null) }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    clearMessages()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    clearMessages()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setMessage('Account created! Check your email to confirm.')
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    clearMessages()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    if (error) setError(error.message)
    else setMessage('Password reset link sent to your email.')
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">WB</div>
          <h1>WealthBuilder 1031</h1>
        </div>
        <p className="auth-tagline">
          AI-powered 1031 exchange automation. Never miss a deadline again.
        </p>
        <div className="auth-features">
          <div className="auth-feature">
            <span className="feature-dot green"></span>
            Automated deadline tracking
          </div>
          <div className="auth-feature">
            <span className="feature-dot blue"></span>
            AI property matching
          </div>
          <div className="auth-feature">
            <span className="feature-dot amber"></span>
            Instant broker outreach
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); clearMessages() }}
            >Sign in</button>
            <button
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => { setMode('signup'); clearMessages() }}
            >Create account</button>
          </div>

          {mode === 'reset' ? (
            <>
              <h2>Reset your password</h2>
              <p className="auth-subtitle">We'll send a reset link to your email.</p>
              <form onSubmit={handleReset}>
                <div className="field">
                  <label>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {error && <div className="auth-error">{error}</div>}
                {message && <div className="auth-success">{message}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
                <button type="button" className="btn-link" onClick={() => { setMode('login'); clearMessages() }}>
                  Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>{mode === 'login' ? 'Welcome back' : 'Get started'}</h2>
              <p className="auth-subtitle">
                {mode === 'login' ? 'Sign in to your dashboard' : 'Create your account'}
              </p>
              <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
                <div className="field">
                  <label>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                {mode === 'login' && (
                  <button type="button" className="btn-link forgot" onClick={() => { setMode('reset'); clearMessages() }}>
                    Forgot password?
                  </button>
                )}
                {error && <div className="auth-error">{error}</div>}
                {message && <div className="auth-success">{message}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
