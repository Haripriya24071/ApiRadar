import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BarChart3, CalendarClock, CircleHelp, ExternalLink, Radar, ShieldAlert, Sparkles } from 'lucide-react'
import { APIChangeForecast, forecastsAPI } from '../lib/api'

type Filter = 'ALL' | 'FORECASTS' | 'ANNOUNCED' | 'NEEDS HISTORY'

function formatDate(value?: string | null) {
  if (!value) return 'DATE NOT SET'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

function ForecastCard({ item }: { item: APIChangeForecast }) {
  const isScheduled = item.status === 'scheduled'
  const hasForecast = item.status === 'forecast'
  const confidence = item.confidence.toUpperCase()
  return (
    <article className={`forecast-result-card ${isScheduled ? 'forecast-result-scheduled' : ''} ${!hasForecast && !isScheduled ? 'forecast-result-empty' : ''}`}>
      <div className="forecast-result-top">
        <div className="forecast-provider-lockup">
          {item.logo_url ? <img src={item.logo_url} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <span className="forecast-provider-mark">{item.api_name.slice(0, 1)}</span>}
          <span>{item.api_name}</span>
        </div>
        <span className={`forecast-status-chip ${isScheduled ? 'status-announced' : hasForecast ? 'status-risk' : 'status-muted'}`}>
          {isScheduled ? 'ANNOUNCED' : hasForecast ? 'TREND RISK' : item.status === 'low_risk' ? 'LOW SIGNAL' : 'NEEDS HISTORY'}
        </span>
      </div>

      <div className="forecast-result-middle">
        <div className={`forecast-probability ${isScheduled ? 'probability-scheduled' : ''} ${!hasForecast && !isScheduled ? 'probability-empty' : ''}`}>
          <strong>{item.probability_percent == null ? '—' : `${item.probability_percent}%`}</strong>
          <span>{isScheduled ? 'PUBLISHED DATE' : '90-DAY CHANCE'}</span>
        </div>
        <div className="forecast-result-copy">
          <h2>{item.title}</h2>
          <p>{item.summary}</p>
        </div>
      </div>

      <div className="forecast-result-meta">
        <span><CalendarClock size={14} /> {isScheduled ? `DUE ${formatDate(item.expected_by)}` : `THROUGH ${formatDate(item.expected_by)}`}</span>
        <span><BarChart3 size={14} /> {isScheduled ? 'SOURCE-CONFIRMED' : `CONFIDENCE ${confidence}`}</span>
        {!isScheduled && <span>{item.source_updates} SOURCED UPDATES · {item.actionable_updates} ACTIONABLE</span>}
      </div>

      {item.evidence.length > 0 && (
        <div className="forecast-evidence-list">
          <div className="forecast-evidence-label"><ShieldAlert size={13} /> EVIDENCE USED</div>
          {item.evidence.map((evidence, index) => (
            <a key={`${evidence.url}-${index}`} href={evidence.url} target="_blank" rel="noreferrer" className="forecast-evidence-link">
              <span className={`forecast-evidence-severity severity-${evidence.severity.toLowerCase()}`}>{evidence.severity}</span>
              <span>{evidence.title}</span><ExternalLink size={12} />
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

export default function Forecast() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const forecastQuery = useQuery({
    queryKey: ['forecasts', 90],
    queryFn: () => forecastsAPI.list({ horizon_days: 90 }),
    staleTime: 5 * 60 * 1000,
  })
  const items = forecastQuery.data || []
  const predicted = items.filter((item) => item.status === 'forecast')
  const announced = items.filter((item) => item.status === 'scheduled')
  const insufficient = items.filter((item) => item.status === 'insufficient_history' || item.status === 'low_risk')
  const filters: Filter[] = ['ALL', 'FORECASTS', 'ANNOUNCED', 'NEEDS HISTORY']
  const visible = items.filter((item) => {
    if (filter === 'FORECASTS') return item.status === 'forecast'
    if (filter === 'ANNOUNCED') return item.status === 'scheduled'
    if (filter === 'NEEDS HISTORY') return item.status === 'insufficient_history' || item.status === 'low_risk'
    return true
  })

  return (
    <div className="forecast-page">
      <section className="forecast-page-hero">
        <div className="forecast-page-heading">
          <div className="editorial-label mb-3">00_2 // EXPERIMENTAL SIGNAL MODEL</div>
          <h1>90-Day<br /><span>Outlook</span></h1>
          <p>See where the history points. Every estimate links back to the provider updates that informed it.</p>
        </div>
        <div className="forecast-page-orbit" aria-hidden="true"><span /><Radar size={54} strokeWidth={1.2} /></div>
        <div className="forecast-page-range"><span>FORECAST WINDOW</span><b>NOW <i /> + 90 DAYS</b></div>
      </section>

      <section className="forecast-method-panel">
        <div className="forecast-method-icon"><Sparkles size={19} /></div>
        <div><h2>What this forecast means</h2><p>ApiRadar estimates the chance of at least one warning or breaking-change signal based on each provider’s sourced history. It does not claim to know an unpublished endpoint change. Confirmed future dates appear separately as provider-announced changes.</p></div>
        <div className="forecast-method-label"><CircleHelp size={14} /> EXPERIMENTAL<br />HISTORY-BASED ESTIMATE</div>
      </section>

      <section className="forecast-summary-row">
        <div><span>RISK SIGNALS</span><b>{forecastQuery.isLoading ? '—' : predicted.length.toString().padStart(2, '0')}</b></div>
        <div><span>ANNOUNCED DATES</span><b>{forecastQuery.isLoading ? '—' : announced.length.toString().padStart(2, '0')}</b></div>
        <div><span>NEEDS MORE HISTORY</span><b>{forecastQuery.isLoading ? '—' : insufficient.length.toString().padStart(2, '0')}</b></div>
      </section>

      <nav className="forecast-filter-row" aria-label="Filter forecast results">
        <div>{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item}</button>)}</div>
        <span><Radar size={13} /> {forecastQuery.isLoading ? 'UPDATING SIGNALS' : `COVERING ${items.length} CATALOG APIS`}</span>
      </nav>

      {forecastQuery.isLoading && <div className="forecast-empty-state">READING PROVIDER HISTORY…</div>}
      {forecastQuery.isError && <div className="forecast-empty-state forecast-error-state">Could not load forecast data. Check that the ApiRadar backend is running, then refresh.</div>}
      {!forecastQuery.isLoading && !forecastQuery.isError && visible.length === 0 && (
        <div className="forecast-empty-state">Nothing in this forecast filter yet. Choose ALL to see every provider’s current history status.</div>
      )}
      {!forecastQuery.isLoading && !forecastQuery.isError && (
        <div className="forecast-results-grid">{visible.map((item) => <ForecastCard key={item.id} item={item} />)}</div>
      )}

      <section className="forecast-caveat"><span>MODEL NOTE / 01</span><p>Forecasts are early, historical-rate estimates, not calibrated promises. A provider can change plans at any time. Low-data APIs are marked instead of guessed. ApiRadar will need more verified history and forecast-vs-outcome tracking before this can be described as a reliable three-month prediction.</p><a href="/dashboard/feed">SEE CONFIRMED CHANGES <ArrowUpRight size={14} /></a></section>
    </div>
  )
}
