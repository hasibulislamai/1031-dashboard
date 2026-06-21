import React, { useState } from 'react'
import './DealCard.css'

export default function DealCard({ deal, onPropertyMatch, onBrokerOutreach, getDaysLeft }) {
  const [matchLoading, setMatchLoading] = useState(false)
  const [outreachLoading, setOutreachLoading] = useState(false)

  const daysLeft = getDaysLeft(deal.deadline_45)

  const getDeadlineBadge = () => {
    if (daysLeft === null) return null
    if (daysLeft <= 0) return { label: 'Expired', cls: 'badge-red' }
    if (daysLeft <= 14) return { label: `${daysLeft}d left`, cls: 'badge-red' }
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, cls: 'badge-amber' }
    return { label: `${daysLeft}d left`, cls: 'badge-green' }
  }

  const badge = getDeadlineBadge()

  const formatMoney = (n) => {
    if (!n) return '—'
    return '$' + Number(n).toLocaleString()
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleMatch = async () => {
    setMatchLoading(true)
    await onPropertyMatch(deal)
    setMatchLoading(false)
  }

  const handleOutreach = async () => {
    setOutreachLoading(true)
    await onBrokerOutreach(deal)
    setOutreachLoading(false)
  }

  return (
    <div className="deal-card">
      <div className="deal-top">
        <div className="deal-info">
          <div className="deal-name-row">
            <h3 className="deal-name">{deal.client_name}</h3>
            {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
            <span className={`badge badge-status ${deal.status === 'active' ? 'badge-blue' : 'badge-gray'}`}>
              {deal.status || 'active'}
            </span>
          </div>
          <p className="deal-meta">
            {formatMoney(deal.sale_amount)}
            {deal.property_sold_type ? ` · ${deal.property_sold_type}` : ''}
            {' · 45-day deadline '}
            {formatDate(deal.deadline_45)}
          </p>
        </div>
        <div className="deal-actions">
          <button
            className="btn-action btn-match"
            onClick={handleMatch}
            disabled={matchLoading || outreachLoading}
          >
            {matchLoading ? 'Running...' : '🔍 Match properties'}
          </button>
          <button
            className="btn-action btn-outreach"
            onClick={handleOutreach}
            disabled={matchLoading || outreachLoading}
          >
            {outreachLoading ? 'Sending...' : '📧 Broker outreach'}
          </button>
        </div>
      </div>

      <div className="deal-stats">
        <div className="deal-stat">
          <p className="ds-label">Client email</p>
          <p className="ds-value">{deal.client_email || '—'}</p>
        </div>
        <div className="deal-stat">
          <p className="ds-label">Properties matched</p>
          <p className="ds-value">{deal.properties_identified || 0}</p>
        </div>
        <div className="deal-stat">
          <p className="ds-label">180-day deadline</p>
          <p className="ds-value">{formatDate(deal.deadline_180)}</p>
        </div>
        <div className="deal-stat">
          <p className="ds-label">Sale date</p>
          <p className="ds-value">{formatDate(deal.sale_date)}</p>
        </div>
      </div>
    </div>
  )
}
