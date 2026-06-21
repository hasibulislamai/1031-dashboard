import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import DealCard from './DealCard'
import AddDealModal from './AddDealModal'
import './Dashboard.css'

const N8N_BASE = 'https://n8n.diptyai.com/webhook'

export default function Dashboard({ session }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ex_deals')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setDeals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleRunPropertyMatch = async (deal) => {
    showToast(`Running AI property match for ${deal.client_name}...`, 'info')
    try {
      const res = await fetch(`${N8N_BASE}/1031-property-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          requirements: `Looking for ${deal.property_sold_type || 'commercial'} property in Texas`,
          preferred_state: 'TX',
          preferred_type: deal.property_sold_type || 'retail',
          min_budget: deal.sale_amount * 0.8,
          max_budget: deal.sale_amount * 1.5,
          min_cap_rate: 6
        })
      })
      if (res.ok) showToast(`Property match report sent to ${deal.client_email}!`)
      else showToast('Something went wrong. Try again.', 'error')
    } catch {
      showToast('Network error. Check n8n is running.', 'error')
    }
  }

  const handleBrokerOutreach = async (deal) => {
    showToast(`Sending broker outreach for ${deal.client_name}...`, 'info')
    try {
      const res = await fetch(`${N8N_BASE}/1031-broker-outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          target_state: 'TX',
          target_property_type: deal.property_sold_type || 'retail',
          max_budget: deal.sale_amount * 1.5
        })
      })
      if (res.ok) showToast(`Broker outreach started for ${deal.client_name}!`)
      else showToast('Something went wrong. Try again.', 'error')
    } catch {
      showToast('Network error. Check n8n is running.', 'error')
    }
  }

  const getDaysLeft = (deadline) => {
    if (!deadline) return null
    const diff = new Date(deadline) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const urgentCount = deals.filter(d => {
    const days = getDaysLeft(d.deadline_45)
    return days !== null && days <= 14 && days > 0
  }).length

  const totalVolume = deals.reduce((sum, d) => sum + (d.sale_amount || 0), 0)
  const totalBrokers = deals.reduce((sum, d) => sum + (d.properties_identified || 0), 0)

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">WB</div>
          <div>
            <p className="dash-brand">WealthBuilder 1031</p>
            <p className="dash-subtitle">Exchange dashboard</p>
          </div>
        </div>
        <div className="dash-header-right">
          <span className="dash-user">{session.user.email}</span>
          <button className="btn-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-top">
          <h1 className="dash-title">Active exchanges</h1>
          <button className="btn-add" onClick={() => setShowAddDeal(true)}>
            + New deal
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Active deals</p>
            <p className="stat-value">{deals.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Urgent (≤14 days)</p>
            <p className="stat-value urgent">{urgentCount}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Properties matched</p>
            <p className="stat-value">{totalBrokers}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total volume</p>
            <p className="stat-value">${(totalVolume / 1000000).toFixed(1)}M</p>
          </div>
        </div>

        {loading ? (
          <div className="deals-loading">
            <div className="spinner-sm"></div>
            <p>Loading deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="deals-empty">
            <p className="empty-title">No active exchanges</p>
            <p className="empty-sub">Add your first deal to get started.</p>
            <button className="btn-add" onClick={() => setShowAddDeal(true)}>+ Add first deal</button>
          </div>
        ) : (
          <div className="deals-list">
            {deals.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                onPropertyMatch={handleRunPropertyMatch}
                onBrokerOutreach={handleBrokerOutreach}
                getDaysLeft={getDaysLeft}
              />
            ))}
          </div>
        )}
      </main>

      {showAddDeal && (
        <AddDealModal
          onClose={() => setShowAddDeal(false)}
          onSuccess={() => { setShowAddDeal(false); fetchDeals(); showToast('Deal added successfully!') }}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
