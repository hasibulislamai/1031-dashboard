import { useState, useEffect } from 'react';

export default function CasioClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const h = pad(time.getHours());
  const m = pad(time.getMinutes());
  const s = pad(time.getSeconds());
  const day = days[time.getDay()];
  const date = pad(time.getDate());
  const month = months[time.getMonth()];
  const year = time.getFullYear();

  return (
    <div style={{
      background: '#0a0a0a',
      border: '3px solid #1a1a1a',
      borderRadius: '12px',
      padding: '16px 20px',
      fontFamily: "'Share Tech Mono', monospace",
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,100,0.08)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(0,255,100,0.03) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />
      <div style={{ fontSize: 10, color: '#00c853', letterSpacing: '0.15em', marginBottom: 6, opacity: 0.7 }}>
        WEALTHBUILDER · 1031
      </div>
      <div style={{
        fontSize: 38,
        color: '#00e676',
        letterSpacing: '0.08em',
        lineHeight: 1,
        textShadow: '0 0 12px rgba(0,230,118,0.5)',
        display: 'flex',
        alignItems: 'baseline',
        gap: 2
      }}>
        <span>{h}</span>
        <span style={{ opacity: time.getSeconds() % 2 === 0 ? 1 : 0.2, transition: 'opacity 0.1s' }}>:</span>
        <span>{m}</span>
        <span style={{ opacity: time.getSeconds() % 2 === 0 ? 1 : 0.2, transition: 'opacity 0.1s' }}>:</span>
        <span style={{ fontSize: 24, color: '#00c853' }}>{s}</span>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, borderTop: '1px solid #1a1a1a', paddingTop: 6
      }}>
        <span style={{ fontSize: 11, color: '#00c853', opacity: 0.8 }}>{day}</span>
        <span style={{ fontSize: 11, color: '#00e676' }}>{date} {month} {year}</span>
      </div>
      <div style={{
        display: 'flex', gap: 4, marginTop: 8
      }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < Math.floor((time.getSeconds() / 60) * 12) ? '#00e676' : '#1a2a1a',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>
    </div>
  );
}
