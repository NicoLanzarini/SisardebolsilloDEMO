import React from 'react'
import { PROCESSED_ZONES, getZonePoints } from '../utils/mockDatabase'

/* ── KPI de zona directamente de mockDatabase ───────────────────── */
function ZoneKPI({ zone }) {
  const points = getZonePoints(zone.id)
  if (!points.length) return null

  const vels = points.map(p => p.velocity)
  const mean = (vels.reduce((a, b) => a + b, 0) / vels.length).toFixed(1)
  const sub  = (vels.filter(v => v < -5).length / vels.length * 100).toFixed(0)
  const coh  = (points.reduce((a, p) => a + p.coherence, 0) / points.length * 100).toFixed(0)

  const items = [
    { label: 'Vel. media', value: `${mean} mm/a`, neg: parseFloat(mean) < 0 },
    { label: 'Subsidencia', value: `${sub}%`, neg: parseFloat(sub) > 20 },
    { label: 'Coherencia', value: `${coh}%`, neg: false },
  ]

  return (
    <div className="sb-kpi-strip">
      {items.map(k => (
        <div key={k.label} className="sb-kpi">
          <div className={`sb-kpi-val ${k.neg ? 'neg' : 'pos'}`}>{k.value}</div>
          <div className="sb-kpi-lbl">{k.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Mini gráfico SVG de serie temporal desde puntos reales ─────── */
function MiniTimeSeries({ zone }) {
  const points = getZonePoints(zone.id)
  if (!points.length) return null

  // Tomar el primer punto con timeSeries
  const pt = points[0]
  if (!pt.timeSeries?.length) return null

  const ts = pt.timeSeries
  const disps = ts.map(d => d.disp)
  const dMin = Math.min(...disps), dMax = Math.max(...disps)
  const dRange = dMax - dMin || 1
  const tMin = ts[0].time, tMax = ts[ts.length - 1].time

  const svgPts = ts.map((d, i) => {
    const x = 10 + (i / (ts.length - 1)) * 200
    const y = 85 - ((d.disp - dMin) / dRange) * 75
    return `${x},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div className="sb-chart-box">
      <div className="sb-chart-label">Serie temporal · {zone.name}</div>
      <svg viewBox="0 0 220 100" style={{ width: '100%', height: 68 }}>
        <line x1="10" x2="210" y1="50" y2="50" stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="3 2" />
        <polyline fill="none" stroke="#22a37c" strokeWidth="1.5" strokeLinecap="round" points={svgPts} />
        <text x="110" y="10" fontSize="7" fill="#22a37c" textAnchor="middle" fontWeight="700">
          {zone.meanVel} mm/año (vel. media)
        </text>
        <text x="10"  y="98" fontSize="6" fill="#9ca3af">{Math.round(tMin)}</text>
        <text x="200" y="98" fontSize="6" fill="#9ca3af" textAnchor="end">{Math.round(tMax)}</text>
      </svg>
    </div>
  )
}

/* ── Componente principal ───────────────────────────────────────── */
export default function Sidebar({
  selectedZone,
  onSelectZone,
  viewMode,
  onViewModeChange,
  onDownloadPdf,
  generatingPdf,
  telegramUrl,
}) {
  return (
    <aside className="sidebar">
      {/* ── Marca ── */}
      <div className="sb-brand">
        <span className="sb-brand-icon">🛰️</span>
        <div>
          <div className="sb-brand-name">SISAR</div>
          <div className="sb-brand-sub">CEDIAC · UNCuyo · CONICET</div>
        </div>
      </div>

      {/* ── Zonas disponibles ── */}
      <div className="sb-section">
        <div className="sb-section-title">📍 Zonas de estudio</div>
        <div className="sb-zone-list">
          {PROCESSED_ZONES.map(zone => {
            const isSel = selectedZone?.id === zone.id
            return (
              <button
                key={zone.id}
                className={`sb-zone-btn ${isSel ? 'active' : ''} ${!zone.processed ? 'disabled' : ''}`}
                onClick={() => zone.processed && onSelectZone(zone)}
                title={zone.processed ? zone.description : 'Zona no procesada aún'}
              >
                <div className="sb-zone-name">
                  {zone.name}
                  <span className={`sb-zone-badge ${zone.processed ? 'processed' : 'pending'}`}>
                    {zone.processed ? '✓ Procesada' : 'Pendiente'}
                  </span>
                </div>
                <div className="sb-zone-sub">{zone.subtitle}</div>
                {zone.processed && (
                  <div className="sb-zone-meta">
                    {zone.nImages} imgs · {zone.dateRange}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detalle de zona seleccionada ── */}
      {selectedZone?.processed && (
        <>
          {/* Info general */}
          <div className="sb-section">
            <div className="sb-section-title">📋 Información</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)', lineHeight: 1.6 }}>
              <div><strong>Sensor:</strong> {selectedZone.sensor}</div>
              <div><strong>Track:</strong> {selectedZone.track}</div>
              <div><strong>Imágenes:</strong> {selectedZone.nImages}</div>
              <div><strong>Período:</strong> {selectedZone.dateRange}</div>
              <div><strong>Vel. media:</strong> {selectedZone.meanVel} mm/año</div>
              <div><strong>Subsidencia máx.:</strong> {selectedZone.maxSubsidence} mm/año</div>
              <div style={{ marginTop: 4, fontStyle: 'italic', opacity: 0.8 }}>{selectedZone.description}</div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="sb-section">
            <div className="sb-section-title">📊 Estadísticas de puntos</div>
            <ZoneKPI zone={selectedZone} />
          </div>

          {/* Mini chart */}
          <div className="sb-section">
            <MiniTimeSeries zone={selectedZone} />
          </div>

          {/* Producto InSAR */}
          <div className="sb-section">
            <div className="sb-section-title">📡 Overlay activo</div>
            <div className="sb-radio-group">
              {[
                { id: 'velocity',      label: 'Velocidad LOS',      sub: 'MintPy SBAS (mm/año)' },
                { id: 'interferogram', label: 'Interferograma',      sub: 'ISCE2 (franjas de fase)' },
              ].map(opt => (
                <label key={opt.id} className={`sb-radio ${viewMode === opt.id ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="viewMode"
                    value={opt.id}
                    checked={viewMode === opt.id}
                    onChange={() => onViewModeChange(opt.id)}
                  />
                  <div>
                    <div className="sb-radio-label">{opt.label}</div>
                    <div className="sb-radio-sub">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Tip de uso */}
          <div className="sb-section">
            <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
              💡 Haz zoom para ver puntos individuales. Clic en un punto → serie temporal completa.
            </div>
          </div>
        </>
      )}

      {/* ── Sin zona seleccionada ── */}
      {!selectedZone && (
        <div className="sb-section" style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.75rem', padding: '20px 14px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
          <div>Seleccioná una zona procesada (borde azul) en el mapa o desde esta lista.</div>
        </div>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Acciones ── */}
      <div className="sb-actions">
        {selectedZone?.processed && (
          <button
            className="sb-btn-pdf"
            onClick={onDownloadPdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? '⏳ Generando...' : '📄 Descargar Reporte PDF'}
          </button>
        )}
        <a
          href={telegramUrl}
          target="_blank"
          rel="noreferrer"
          className="sb-btn-telegram"
        >
          📱 Bot Telegram SISAR
        </a>
      </div>
    </aside>
  )
}
