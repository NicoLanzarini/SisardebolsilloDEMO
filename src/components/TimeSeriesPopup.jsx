import React, { useMemo, useState } from 'react'

/* ── Regresión lineal simple ────────────────────────────────────── */
function linearRegression(pts) {
  const n = pts.length
  const sumX  = pts.reduce((s, p) => s + p.x, 0)
  const sumY  = pts.reduce((s, p) => s + p.y, 0)
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

/* ── Componente principal ───────────────────────────────────────── */
export default function TimeSeriesPopup({ point, zone, options, onClose }) {
  const { showRegression = true, showTheilSen = false, showHistogram = false } = options || {}

  const chart = useMemo(() => {
    if (!point?.timeSeries?.length) return null
    const ts = point.timeSeries

    // Convertir a coordenadas SVG
    const W = 380, H = 160
    const PAD = { l: 40, r: 20, t: 30, b: 30 }
    const cW = W - PAD.l - PAD.r
    const cH = H - PAD.t - PAD.b

    const times = ts.map(d => d.time)
    const disps = ts.map(d => d.disp)
    const tMin = Math.min(...times), tMax = Math.max(...times)
    const dMin = Math.min(...disps), dMax = Math.max(...disps)
    const dRange = dMax - dMin || 1

    const tx = t => PAD.l + (t - tMin) / (tMax - tMin) * cW
    const ty = d => PAD.t + cH - (d - dMin) / dRange * cH

    const pts = ts.map(d => ({ x: d.time, y: d.disp, sx: tx(d.time), sy: ty(d.disp) }))
    const polyPoints = pts.map(p => `${p.sx},${p.sy}`).join(' ')

    // Regresión lineal
    const { slope, intercept } = linearRegression(pts)
    const r1 = { x: tMin, y: slope * tMin + intercept }
    const r2 = { x: tMax, y: slope * tMax + intercept }
    const rLine = `${tx(r1.x)},${ty(r1.y)} ${tx(r2.x)},${ty(r2.y)}`

    // Ejes X (años)
    const years = []
    for (let y = Math.ceil(tMin); y <= Math.floor(tMax); y++) years.push(y)

    // Zero line Y
    const zero = ty(0)

    return { pts, polyPoints, rLine, zero, tx, ty, tMin, tMax, dMin, dMax, years, W, H, PAD, slope }
  }, [point])

  if (!point || !chart) return null

  const velColor = point.velocity < -5 ? '#e53e3e' : point.velocity < 0 ? '#ed8936' : '#38a169'

  return (
    <div className="ts-popup">
      {/* Header */}
      <div className="ts-popup-header">
        <div>
          <div className="ts-popup-title">Serie Temporal InSAR</div>
          <div className="ts-popup-pos">
            📍 {point.lat.toFixed(4)}°, {point.lon.toFixed(4)}°
            {zone && <span style={{ marginLeft: 8, opacity: 0.7 }}>— {zone.name}</span>}
          </div>
        </div>
        <button className="ts-popup-close" onClick={onClose}>✕</button>
      </div>

      {/* Stats */}
      <div className="ts-popup-stats">
        <div className="ts-stat">
          <span className="ts-stat-val" style={{ color: velColor }}>
            {point.velocity > 0 ? '+' : ''}{point.velocity.toFixed(2)}
          </span>
          <span className="ts-stat-lbl">mm/año (vel. LOS)</span>
        </div>
        <div className="ts-stat">
          <span className="ts-stat-val">{(point.coherence * 100).toFixed(0)}%</span>
          <span className="ts-stat-lbl">coherencia</span>
        </div>
        {zone && (
          <div className="ts-stat">
            <span className="ts-stat-val">{zone.nImages || '—'}</span>
            <span className="ts-stat-lbl">imágenes SAR</span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Fondo */}
        <rect x={chart.PAD.l} y={chart.PAD.t} width={chart.W - chart.PAD.l - chart.PAD.r}
          height={chart.H - chart.PAD.t - chart.PAD.b} fill="#f8fafc" />

        {/* Grilla horizontal */}
        {[0.25, 0.5, 0.75].map(f => {
          const y = chart.PAD.t + f * (chart.H - chart.PAD.t - chart.PAD.b)
          return <line key={f} x1={chart.PAD.l} x2={chart.W - chart.PAD.r} y1={y} y2={y}
            stroke="#e2e8f0" strokeWidth="0.5" />
        })}

        {/* Línea cero */}
        {chart.zero > chart.PAD.t && chart.zero < chart.H - chart.PAD.b && (
          <line x1={chart.PAD.l} x2={chart.W - chart.PAD.r}
            y1={chart.zero} y2={chart.zero}
            stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3 2" />
        )}

        {/* Ejes */}
        <line x1={chart.PAD.l} x2={chart.PAD.l} y1={chart.PAD.t} y2={chart.H - chart.PAD.b}
          stroke="#64748b" strokeWidth="1" />
        <line x1={chart.PAD.l} x2={chart.W - chart.PAD.r} y1={chart.H - chart.PAD.b} y2={chart.H - chart.PAD.b}
          stroke="#64748b" strokeWidth="1" />

        {/* Puntos de datos (triángulos como en la página del profesor) */}
        {chart.pts.map((p, i) => (
          <polygon key={i}
            points={`${p.sx},${p.sy - 4} ${p.sx - 3.5},${p.sy + 3} ${p.sx + 3.5},${p.sy + 3}`}
            fill="none" stroke="#22a37c" strokeWidth="1" opacity="0.75"
          />
        ))}

        {/* Regresión lineal */}
        {showRegression && (
          <line x1={chart.rLine.split(' ')[0].split(',')[0]}
                y1={chart.rLine.split(' ')[0].split(',')[1]}
                x2={chart.rLine.split(' ')[1].split(',')[0]}
                y2={chart.rLine.split(' ')[1].split(',')[1]}
                stroke="#e53e3e" strokeWidth="2" />
        )}

        {/* Etiquetas eje X (años) */}
        {chart.years.map(y => (
          <text key={y} x={chart.tx(y)} y={chart.H - 4}
            fontSize="7" fill="#64748b" textAnchor="middle">{y.toFixed(1)}</text>
        ))}

        {/* Etiqueta Y */}
        <text x={chart.PAD.l - 6} y={chart.PAD.t + (chart.H - chart.PAD.t - chart.PAD.b) / 2}
          fontSize="7" fill="#64748b" textAnchor="middle"
          transform={`rotate(-90, ${chart.PAD.l - 14}, ${chart.PAD.t + (chart.H - chart.PAD.t - chart.PAD.b) / 2})`}
        >Deform. [mm]</text>

        {/* Velocidad en el gráfico */}
        <text x={chart.W / 2} y={16} fontSize="8.5" fill="#1a365d"
          textAnchor="middle" fontWeight="700" fontStyle="italic">
          {`vel = ${point.velocity > 0 ? '+' : ''}${point.velocity.toFixed(3)} mm/año`}
        </text>
      </svg>

      {/* Leyenda */}
      {showRegression && (
        <div className="ts-legend">
          <span className="ts-legend-item">
            <span style={{ color: '#22a37c', marginRight: 4 }}>△</span> Datos SBAS
          </span>
          <span className="ts-legend-item">
            <span style={{ color: '#e53e3e', fontWeight: 700, marginRight: 4 }}>—</span> Regresión lineal
          </span>
        </div>
      )}
    </div>
  )
}
