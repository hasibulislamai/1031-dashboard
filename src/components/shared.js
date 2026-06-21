import { X, CheckCircle2, XCircle } from 'lucide-react';

export const C = {
  text: '#37352F',
  textMuted: '#787774',
  border: '#E9E9E7',
  bgAlt: '#F7F7F5',
};

export const cls = (...a) => a.filter(Boolean).join(' ');
export const genId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
export const pad = (n) => String(n).padStart(2, '0');
export const addDays = (d, n) => new Date(new Date(d).getTime() + n * 86400000);
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const fmtMoney = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
export const fmtShort = (n) => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};

export function Badge({ children, color }) {
  const m = {
    green: { background: '#DCFCE7', color: '#15803D' },
    amber: { background: '#FEF3C7', color: '#B45309' },
    red: { background: '#FEE2E2', color: '#DC2626' },
    blue: { background: '#DBEAFE', color: '#1D4ED8' },
    purple: { background: '#EDE9FE', color: '#6D28D9' },
    gray: { background: '#F7F7F5', color: '#787774' },
  };
  return (
    <span style={{ ...(m[color] || m.gray), padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {children}
    </span>
  );
}

export function Btn({ children, onClick, variant = 'primary', size = 'sm', disabled, style = {}, type = 'button' }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit', border: 'none', transition: 'opacity 0.15s', ...style };
  const sz = { sm: { padding: '6px 12px', fontSize: 12 }, md: { padding: '8px 16px', fontSize: 13 } };
  const v = {
    primary: { background: '#16A34A', color: 'white' },
    danger: { background: '#DC2626', color: 'white' },
    ghost: { background: 'transparent', color: C.text, border: `1px solid ${C.border}` },
    subtle: { background: C.bgAlt, color: C.textMuted },
    blue: { background: '#2563EB', color: 'white' },
    purple: { background: '#7C3AED', color: 'white' },
  };
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...sz[size], ...v[variant] }}>{children}</button>;
}

export function IconBtn({ icon: Icon, onClick, title, danger, color }) {
  return (
    <button onClick={onClick} title={title} style={{ padding: 6, borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: danger ? '#DC2626' : color || C.textMuted, display: 'flex', alignItems: 'center' }}>
      <Icon size={14} />
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: C.textMuted, marginBottom: 4 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 11, marginTop: 3, color: C.textMuted }}>{hint}</span>}
    </label>
  );
}

const iStyle = { width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', fontFamily: 'inherit', color: C.text, background: '#fff', boxSizing: 'border-box' };
export function Input(p) { return <input {...p} style={{ ...iStyle, ...p.style }} />; }
export function Select(p) { return <select {...p} style={{ ...iStyle, ...p.style }} />; }
export function Textarea(p) { return <textarea {...p} style={{ ...iStyle, minHeight: 80, resize: 'vertical', ...p.style }} />; }

export function Modal({ title, onClose, children, width = '480px' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(55,53,47,0.45)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`, width: '100%', maxWidth: width, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ state, onCancel }) {
  if (!state) return null;
  return (
    <Modal title={state.title} onClose={onCancel} width="360px">
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>{state.message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant={state.danger ? 'danger' : 'primary'} onClick={() => { state.onConfirm(); onCancel(); }}>{state.confirmLabel || 'Confirm'}</Btn>
      </div>
    </Modal>
  );
}

export function Toasts({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 60, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'white', background: t.type === 'error' ? '#DC2626' : '#16A34A', minWidth: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {t.type === 'error' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}{t.msg}
        </div>
      ))}
    </div>
  );
}

export function MetricCard({ label, value, color, sub, icon: Icon }) {
  const colors = { red: '#DC2626', amber: '#D97706', green: '#16A34A', blue: '#2563EB', purple: '#7C3AED' };
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {Icon && <Icon size={12} />}{label}
      </div>
      <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 22, fontWeight: 600, color: colors[color] || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 3, color: C.textMuted }}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: C.textMuted }}>
      <Icon size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

export function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, marginBottom: 12 }}>{subtitle}</div>}
      <div style={{ marginTop: subtitle ? 0 : 8 }}>{children}</div>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = (msg, type = 'success') => {
    const id = genId();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, toast };
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(null);
  const confirm = (cfg) => setConfirmState(cfg);
  const cancelConfirm = () => setConfirmState(null);
  return { confirmState, confirm, cancelConfirm };
}

// Re-export useState for convenience
export { useState } from 'react';

export function getDealUrgency(d) {
  if (d.status === 'closed') return { key: 'closed', label: 'Closed', color: 'gray', daysLeft: null, deadlineLabel: '—' };
  const now = Date.now();
  const d45 = new Date(d.deadline_45).getTime();
  const d180 = new Date(d.deadline_180).getTime();
  let target, deadlineLabel;
  if (now < d45) { target = d45; deadlineLabel = '45-day'; } else { target = d180; deadlineLabel = '180-day'; }
  const daysLeft = Math.ceil((target - now) / 86400000);
  let key, color, label;
  if (daysLeft < 7) { key = 'critical'; color = 'red'; label = 'Critical'; }
  else if (daysLeft < 30) { key = 'urgent'; color = 'amber'; label = 'Urgent'; }
  else { key = 'on_track'; color = 'green'; label = 'On track'; }
  return { key, label, color, daysLeft, deadlineLabel, deadlineDate: new Date(target) };
}
