import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import './AddDealModal.css'

export default function AddDealModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    sale_date: '',
    sale_amount: '',
    property_sold_type: 'retail',
    property_sold_address: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const saleDate = new Date(form.sale_date)
    const deadline45 = new Date(saleDate)
    deadline45.setDate(deadline45.getDate() + 45)
    const deadline180 = new Date(saleDate)
    deadline180.setDate(deadline180.getDate() + 180)

    const { error } = await supabase.from('ex_deals').insert([{
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone || null,
      sale_date: form.sale_date,
      sale_amount: parseFloat(form.sale_amount),
      property_sold_type: form.property_sold_type,
      property_sold_address: form.property_sold_address || null,
      deadline_45: deadline45.toISOString().split('T')[0],
      deadline_180: deadline180.toISOString().split('T')[0],
      status: 'active',
      properties_identified: 0,
      alert_count: 0
    }])

    if (error) setError(error.message)
    else onSuccess()
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Add new exchange deal</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-section">
            <p className="modal-section-label">Client information</p>
            <div className="field-row">
              <div className="field">
                <label>Full name *</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={e => set('client_name', e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.client_email}
                  onChange={e => set('client_email', e.target.value)}
                  placeholder="john@email.com"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={form.client_phone}
                onChange={e => set('client_phone', e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          <div className="modal-section">
            <p className="modal-section-label">Sale details</p>
            <div className="field-row">
              <div className="field">
                <label>Sale date *</label>
                <input
                  type="date"
                  value={form.sale_date}
                  onChange={e => set('sale_date', e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Sale amount ($) *</label>
                <input
                  type="number"
                  value={form.sale_amount}
                  onChange={e => set('sale_amount', e.target.value)}
                  placeholder="5000000"
                  required
                  min="1"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Property type</label>
                <select value={form.property_sold_type} onChange={e => set('property_sold_type', e.target.value)}>
                  <option value="retail">Retail</option>
                  <option value="office">Office</option>
                  <option value="industrial">Industrial</option>
                  <option value="multifamily">Multifamily</option>
                  <option value="mixed-use">Mixed use</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label>Property address</label>
                <input
                  type="text"
                  value={form.property_sold_address}
                  onChange={e => set('property_sold_address', e.target.value)}
                  placeholder="123 Main St, Austin TX"
                />
              </div>
            </div>
          </div>

          {form.sale_date && (
            <div className="modal-deadlines">
              <div className="deadline-pill">
                <span>45-day deadline</span>
                <strong>{new Date(new Date(form.sale_date).getTime() + 45 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              </div>
              <div className="deadline-pill">
                <span>180-day deadline</span>
                <strong>{new Date(new Date(form.sale_date).getTime() + 180 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              </div>
            </div>
          )}

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
