import React, { useState, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import InSARMap from '../components/InSARMap'
import ControlsPanel from '../components/ControlsPanel'
import { PROCESSED_ZONES } from '../utils/mockDatabase'
import { generateInSAR, velocityColor } from '../utils/terrain'

const TELEGRAM_BOT_URL = 'https://t.me/Prueba_Benjabot'

/* ── Default controls state ─────────────────────────────────────── */
const DEFAULT_CONTROLS = {
  mapType: 'osm',
  scale: 2,
  wrap: 0,
  plotMin: -20,
  plotMax: 11,
  layers: { velocity: true, coherence: false, interferogram: false, psVelocity: false },
  geojson: { areas: true, convencionales: true, shale: true, tight: true },
  showHistogram: false,
  showLinear: true,
  showTheilSen: false,
}

/* ── PDF Builder ────────────────────────────────────────────────── */
function buildPdf(zone, computeTime) {
  let mapTopDown = ''
  try {
    const S = 256
    const canvas = document.createElement('canvas')
    canvas.width = S; canvas.height = S
    const ctx = canvas.getContext('2d')
    const data = generateInSAR(S, S, zone.bounds, zone.seed)
    const imgData = ctx.createImageData(S, S)
    for (let i = 0; i < data.length; i++) {
      const [r, g, b] = velocityColor(data[i])
      imgData.data[i * 4]     = Math.round(r * 255)
      imgData.data[i * 4 + 1] = Math.round(g * 255)
      imgData.data[i * 4 + 2] = Math.round(b * 255)
      imgData.data[i * 4 + 3] = 255
    }
    ctx.putImageData(imgData, 0, 0)
    mapTopDown = canvas.toDataURL()
  } catch (_) {}

  const insar = generateInSAR(32, 32, zone.bounds, zone.seed)
  const valid = insar.filter(v => !isNaN(v)).sort((a, b) => a - b)
  const mean    = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)
  const p05     = valid[Math.floor(valid.length * 0.05)].toFixed(1)
  const p95     = valid[Math.floor(valid.length * 0.95)].toFixed(1)
  const subPct  = (valid.filter(v => v < -5).length / valid.length * 100).toFixed(1)
  const cohPct  = (valid.length / insar.length * 100).toFixed(1)

  const nDates = 24; let cum = 0
  const rate = parseFloat(mean)
  const tsPoints = []
  for (let i = 0; i < nDates; i++) {
    cum += (rate / 12) + (Math.random() - 0.5) * 1.2
    const x = 40 + (i / (nDates - 1)) * 420
    const y = 100 - cum * 3.5
    tsPoints.push(`${x},${Math.max(10, Math.min(190, y))}`)
  }

  const bins = 15
  const vmin = valid[0], vmax = valid[valid.length - 1]
  const binW = (vmax - vmin) / bins
  const hist = new Array(bins).fill(0)
  valid.forEach(v => { hist[Math.min(Math.floor((v - vmin) / binW), bins - 1)]++ })
  const histMax = Math.max(...hist)

  const fechaHora = new Date().toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>SISAR — Reporte InSAR — ${zone.name}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;padding:36px 44px;max-width:850px;margin:0 auto;font-size:0.9rem}
  h1{color:#1a365d;border-bottom:3px solid #c9a24a;padding-bottom:10px;font-size:1.6rem;margin-bottom:6px}
  h2{color:#1a365d;margin-top:26px;border-left:4px solid #0d9488;padding-left:12px;font-size:1.1rem}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
  .badge{background:#fdf6e3;color:#1a365d;border:1px solid #c9a24a;border-radius:6px;padding:3px 10px;font-size:0.75rem}
  .meta{font-size:0.78rem;color:#7a8494;line-height:1.7;text-align:right}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  th{background:#1a365d;color:#fff;text-align:left;padding:7px 12px;font-size:0.78rem}
  td{padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:0.82rem}
  .section{background:#f8fafc;border:1px solid #dde1e6;border-radius:8px;padding:14px 16px;margin:12px 0}
  .kpi-row{display:flex;gap:12px;margin:14px 0;flex-wrap:wrap}
  .kpi{background:#eef6ff;border:1px solid #b3d4fc;border-radius:6px;padding:10px 16px;flex:1;min-width:140px}
  .kpi .val{font-size:1.3rem;font-weight:700;color:#1a365d}
  .kpi .lbl{font-size:0.68rem;color:#555e6b;text-transform:uppercase;letter-spacing:0.03em}
  .chart-container{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:12px 0}
  .chart-title{font-size:0.85rem;font-weight:700;color:#1a365d;margin-bottom:4px}
  .chart-sub{font-size:0.72rem;color:#7a8494;margin-bottom:10px}
  .conclusion{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:0.82rem;line-height:1.7}
  .conclusion strong{color:#166534}
  .footer{margin-top:36px;padding-top:14px;border-top:2px solid #e5e7eb;font-size:0.72rem;color:#7a8494}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div>
    <h1>SISAR — Reporte de Analisis InSAR</h1>
    <span class="badge">CEDIAC · UNCuyo · CONICET</span>
  </div>
  <div class="meta">
    <strong>Fecha:</strong> ${fechaHora}<br>
    <strong>Usuario:</strong> nicolaslanzarini@gmail.com<br>
    <strong>Tiempo de calculo:</strong> ${computeTime || '—'} seg (demo)
  </div>
</div>

<h2>Zona de Estudio</h2>
<div class="section">
  <strong>${zone.name}</strong> — ${zone.subtitle}<br>${zone.description}<br>
  <span style="font-size:0.78rem;color:#7a8494;">
    Lat: ${zone.bounds.south.toFixed(3)}° a ${zone.bounds.north.toFixed(3)}° &nbsp;|&nbsp;
    Lon: ${zone.bounds.west.toFixed(3)}° a ${zone.bounds.east.toFixed(3)}°<br>
    Sensor: ${zone.sensor || 'Sentinel-1'} &nbsp;|&nbsp; Track: ${zone.track || '—'} &nbsp;|&nbsp;
    Imágenes: ${zone.nImages} &nbsp;|&nbsp; Período: ${zone.dateRange}
  </span>
</div>

<h2>Mapa de Velocidad LOS — Vista 2D</h2>
<div class="chart-container" style="text-align:center">
  ${mapTopDown
    ? `<img src="${mapTopDown}" style="width:360px;height:360px;border-radius:6px;border:1px solid #dde1e6;image-rendering:pixelated" alt="Mapa velocidad LOS"/>`
    : '<p style="color:#7a8494;font-size:0.82rem">[Mapa no disponible]</p>'}
  <div class="chart-sub" style="margin-top:8px">Rojo: subsidencia | Blanco: estable | Azul: levantamiento</div>
  <div style="margin:6px auto 0;width:300px;height:12px;border-radius:4px;background:linear-gradient(90deg,#7b0d0d,#d74545,#f5a672,#f5f5f5,#8cc8f0,#3a7bd5,#091a40);border:1px solid #dde1e6"></div>
  <div style="display:flex;justify-content:space-between;width:300px;margin:2px auto 0;font-size:0.68rem;color:#7a8494">
    <span>-25 mm/a</span><span>0</span><span>+25 mm/a</span>
  </div>
</div>

<h2>Resultados Principales</h2>
<div class="kpi-row">
  <div class="kpi"><div class="lbl">Velocidad LOS Media</div><div class="val">${zone.meanVel ?? mean} mm/a</div></div>
  <div class="kpi"><div class="lbl">Subsidencia máx.</div><div class="val">${zone.maxSubsidence ?? p05} mm/a</div></div>
  <div class="kpi"><div class="lbl">Area Subsidencia</div><div class="val">${subPct}%</div></div>
  <div class="kpi"><div class="lbl">Cobertura Coherente</div><div class="val">${cohPct}%</div></div>
</div>

<h2>Serie Temporal MintPy SBAS</h2>
<div class="chart-container">
  <div class="chart-title">Desplazamiento Acumulado LOS</div>
  <div class="chart-sub">Punto de máxima deformación — 24 meses</div>
  <svg viewBox="0 0 500 200" width="100%" height="150">
    <line x1="40" x2="460" y1="100" y2="100" stroke="#d1d5db" stroke-width="0.5" stroke-dasharray="3,3"/>
    <polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${tsPoints.join(' ')}"/>
    ${tsPoints.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#0d9488" opacity="0.7"/>`).join('')}
    <text x="40" y="195" font-size="8" fill="#9ca3af">2023-01</text>
    <text x="440" y="195" font-size="8" fill="#9ca3af" text-anchor="end">2024-12</text>
    <text x="250" y="14" font-size="9" fill="#0d9488" text-anchor="middle" font-weight="600">Velocidad: ${zone.meanVel ?? mean} mm/año</text>
  </svg>
</div>

<h2>Histograma MiaplPy — Distribución de Velocidad PS</h2>
<div class="chart-container">
  <div class="chart-title">Distribución de píxeles PS por velocidad LOS</div>
  <svg viewBox="0 0 500 140" width="100%" height="110">
    ${hist.map((count, i) => {
      const bw = 420 / bins
      const bh = (count / histMax) * 100
      const x = 40 + i * bw
      const bc = vmin + (i + 0.5) * binW
      const col = bc < -10 ? '#D64545' : bc < -3 ? '#F5A673' : bc < 3 ? '#9ca3af' : '#8CC8F0'
      return `<rect x="${x}" y="${110 - bh}" width="${bw - 2}" height="${bh}" fill="${col}" opacity="0.8" rx="2"/>`
    }).join('')}
    <line x1="40" x2="460" y1="110" y2="110" stroke="#9ca3af" stroke-width="0.8"/>
    <text x="40" y="125" font-size="7" fill="#9ca3af">${vmin.toFixed(0)} mm/a</text>
    <text x="455" y="125" font-size="7" fill="#9ca3af" text-anchor="end">${vmax.toFixed(0)} mm/a</text>
  </svg>
</div>

<h2>Parámetros del Procesamiento</h2>
<div class="two-col">
  <table>
    <tr><th colspan="2">Pipeline InSAR</th></tr>
    <tr><td>Sensor</td><td>${zone.sensor || 'Sentinel-1 IW SLC'}</td></tr>
    <tr><td>Procesador</td><td>ISCE2 topsStack (16 runs)</td></tr>
    <tr><td>Series temporales</td><td>MintPy (SBAS) + MiaplPy (PS)</td></tr>
    <tr><td>Corr. troposférica</td><td>height_correlation</td></tr>
    <tr><td>Corr. DEM</td><td>Euillades (2004)</td></tr>
  </table>
  <table>
    <tr><th colspan="2">Configuración</th></tr>
    <tr><td>Imágenes SAR</td><td>${zone.nImages}</td></tr>
    <tr><td>Período</td><td>${zone.dateRange}</td></tr>
    <tr><td>Track</td><td>${zone.track || '—'}</td></tr>
    <tr><td>Filtro fase</td><td>Goldstein (alpha=0.8)</td></tr>
    <tr><td>Umbral coherencia</td><td>0.45</td></tr>
  </table>
</div>

<div class="conclusion">
  <strong>ISCE2:</strong> Se procesaron ${zone.nImages} imágenes Sentinel-1 con topsStack, generando interferogramas con baseline perpendicular &lt;250 m.<br><br>
  <strong>MintPy (SBAS):</strong> Velocidad media LOS de ${zone.meanVel ?? mean} mm/año.
  ${(zone.maxSubsidence && zone.maxSubsidence < -10) ? 'Se detecta subsidencia significativa que requiere monitoreo continuo.' : 'Deformación dentro de rangos monitoreados.'}<br><br>
  <strong>MiaplPy (PS):</strong> Cobertura coherente del ${cohPct}%. Los puntos persistentes confirman el patrón de deformación.
</div>

<div class="footer">
  <strong>SISAR</strong> · Universidad Nacional de Cuyo · CEDIAC · CONICET — Mendoza, Argentina<br>
  Datos: Sentinel-1 SLC (ESA/Copernicus) vía Alaska Satellite Facility · DEM Copernicus GLO-30<br>
  Corrección DEM: Euillades, P.A. (2004) · Contacto: @Prueba_Benjabot
</div>
</body></html>`
}

/* ── Componente principal ───────────────────────────────────────── */
export default function MapDashboard({ onBack }) {
  const [selectedZone, setSelectedZone]     = useState(null)
  const [generatingPdf, setGeneratingPdf]   = useState(false)
  const [controls, setControls]             = useState(DEFAULT_CONTROLS)
  const [controlsOpen, setControlsOpen]     = useState(false)

  const handleSelectZone = useCallback((zone) => {
    setSelectedZone(prev => prev?.id === zone.id ? null : zone)
  }, [])

  const handleDownloadPdf = useCallback(() => {
    if (!selectedZone || !selectedZone.processed) return
    setGeneratingPdf(true)
    setTimeout(() => {
      const html = buildPdf(selectedZone, null)
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 600)
      }
      setGeneratingPdf(false)
    }, 600)
  }, [selectedZone])

  const viewMode = controls.layers.interferogram ? 'interferogram' : 'velocity'

  return (
    <div className="map-dashboard dashboard-fadein">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <button className="dash-back-btn" onClick={onBack}>← Inicio</button>
          <div className="dash-header-brand">
            <span className="icon">🛰️</span>
            <h1>SISAR <span className="version">Demo v2.0</span></h1>
          </div>
          <span className="dash-data-label">Sentinel-1 · ISCE2 · MintPy · MiaplPy</span>
        </div>
        <div className="dash-header-right">
          <span><span className="status-dot" /> Datos disponibles</span>
          <span>CEDIAC · UNCuyo</span>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="dash-telegram-btn"
          >
            📱 Bot Telegram
          </a>
          {selectedZone?.processed && (
            <button
              className="dash-telegram-btn"
              style={{ background: '#1a365d', cursor: generatingPdf ? 'not-allowed' : 'pointer' }}
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? '⏳' : '📄'} Reporte PDF
            </button>
          )}
        </div>
      </header>

      {/* ── Cuerpo: sidebar + mapa + controles ── */}
      <div className="map-layout">
        <Sidebar
          selectedZone={selectedZone}
          onSelectZone={handleSelectZone}
          viewMode={viewMode}
          onViewModeChange={(vm) =>
            setControls(c => ({
              ...c,
              layers: {
                ...c.layers,
                velocity: vm === 'velocity',
                interferogram: vm === 'interferogram',
              },
            }))
          }
          onDownloadPdf={handleDownloadPdf}
          generatingPdf={generatingPdf}
          telegramUrl={TELEGRAM_BOT_URL}
        />

        <InSARMap
          selectedZone={selectedZone}
          onSelectZone={handleSelectZone}
          controls={controls}
        />

        <ControlsPanel
          open={controlsOpen}
          onToggle={() => setControlsOpen(o => !o)}
          controls={controls}
          onChange={setControls}
        />
      </div>
    </div>
  )
}
