import React, { useState, useCallback, useRef } from 'react'
import MapSelector from '../components/MapSelector'
import TerrainViewer from '../components/TerrainViewer'
import ProcessTimeline from '../components/ProcessTimeline'
import AnalysisPanel from '../components/AnalysisPanel'
import InSARProducts from '../components/InSARProducts'
import DEMCorrection from '../components/DEMCorrection'
import { REGIONS, generateInSAR } from '../utils/terrain'

// ── Telegram bot link ─────────────────────────────────────────────
const TELEGRAM_BOT_URL = 'https://t.me/Prueba_Benjabot'

export default function Dashboard({ selectedRegion, onSelectRegion, onBack }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [viewMode, setViewMode] = useState('velocity')
  const [exaggeration, setExaggeration] = useState(1.5)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [computeTime, setComputeTime] = useState(null)
  const [computeStart, setComputeStart] = useState(null)
  const resultsRef = useRef(null)

  // Animacion del pipeline — mas lenta (1200ms entre pasos)
  const handleAnalyze = useCallback(() => {
    if (!selectedRegion) return
    setAnalyzing(true)
    setAnalysisComplete(false)
    setPipelineStep(0)
    const startTime = Date.now()
    setComputeStart(startTime)
    setComputeTime(null)

    // Delays reducidos: ~4 segundos total (antes ~11s)
    const delays = [400, 900, 1500, 2200, 3000, 3700]
    const steps = [1, 2, 3, 4, 5, 6]
    steps.forEach((step, i) => {
      setTimeout(() => {
        setPipelineStep(step)
        if (step === 6) {
          setTimeout(() => {
            setAnalyzing(false)
            setAnalysisComplete(true)
            setComputeTime(((Date.now() - startTime) / 1000).toFixed(1))
          }, 500)
        }
      }, delays[i])
    })
  }, [selectedRegion])

  // Generar PDF con los resultados — incluye graficos ISCE2/MintPy/MiaplPy
  const handleDownloadPdf = useCallback(() => {
    setGeneratingPdf(true)
    setTimeout(() => {
      const region = REGIONS.find(r => r.id === selectedRegion)
      if (!region) { setGeneratingPdf(false); return }

      // Capture 3D canvas as image for the PDF
      let canvasDataUrl = ''
      const canvasEl = document.querySelector('#terrain-canvas canvas')
      if (canvasEl) {
        try { canvasDataUrl = canvasEl.toDataURL('image/png') } catch (e) { /* fallback */ }
      }

      // Generate top-down 2D velocity map (offscreen canvas)
      let mapTopDown = ''
      try {
        const mapSize = 256
        const offscreen = document.createElement('canvas')
        offscreen.width = mapSize
        offscreen.height = mapSize
        const ctx = offscreen.getContext('2d')
        const insarMap = generateInSAR(mapSize, mapSize, region.bounds, region.seed)
        const imgData = ctx.createImageData(mapSize, mapSize)
        for (let i = 0; i < insarMap.length; i++) {
          const val = insarMap[i]
          let r = 200, g = 200, b = 200
          if (!isNaN(val)) {
            // Diverging colormap: red (negative) → white (0) → blue (positive)
            const t = Math.max(-25, Math.min(25, val)) / 25 // normalized -1 to 1
            if (t < 0) {
              const s = -t
              r = Math.round(245 - s * 50)
              g = Math.round(245 - s * 200)
              b = Math.round(245 - s * 200)
            } else {
              const s = t
              r = Math.round(245 - s * 200)
              g = Math.round(245 - s * 200)
              b = Math.round(245 - s * 50)
            }
          } else {
            r = 180; g = 180; b = 180
          }
          imgData.data[i * 4] = r
          imgData.data[i * 4 + 1] = g
          imgData.data[i * 4 + 2] = b
          imgData.data[i * 4 + 3] = 255
        }
        ctx.putImageData(imgData, 0, 0)
        mapTopDown = offscreen.toDataURL('image/png')
      } catch (e) { /* fallback */ }

      // Compute stats for the PDF
      const insar = generateInSAR(32, 32, region.bounds, region.seed)
      const valid = insar.filter(v => !isNaN(v))
      valid.sort((a, b) => a - b)
      const mean = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)
      const p05 = valid[Math.floor(valid.length * 0.05)].toFixed(1)
      const p95 = valid[Math.floor(valid.length * 0.95)].toFixed(1)
      const subsidence = (valid.filter(v => v < -5).length / valid.length * 100).toFixed(1)
      const coherent = ((valid.length / insar.length) * 100).toFixed(1)

      // Generate SVG chart data for time series
      const nDates = 24
      let cumDisp = 0
      const rate = parseFloat(mean)
      const tsPoints = []
      for (let i = 0; i < nDates; i++) {
        cumDisp += (rate / 12) + (Math.random() - 0.5) * 1.2
        const x = 40 + (i / (nDates - 1)) * 420
        const y = 100 - cumDisp * 3.5
        tsPoints.push(`${x},${Math.max(10, Math.min(190, y))}`)
      }

      // Histogram data
      const bins = 15
      const vmin = valid[0], vmax = valid[valid.length - 1]
      const binW = (vmax - vmin) / bins
      const hist = new Array(bins).fill(0)
      valid.forEach(v => { const idx = Math.min(Math.floor((v - vmin) / binW), bins - 1); hist[idx]++ })
      const histMax = Math.max(...hist)

      const now = new Date()
      const fechaHora = now.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })

      const htmlContent = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>SISAR - Reporte InSAR - ${region.name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 36px 44px; max-width: 850px; margin: 0 auto; font-size: 0.9rem; }
  h1 { color: #1a365d; border-bottom: 3px solid #c9a24a; padding-bottom: 10px; font-size: 1.6rem; margin-bottom: 6px; }
  h2 { color: #1a365d; margin-top: 26px; border-left: 4px solid #0d9488; padding-left: 12px; font-size: 1.1rem; }
  h3 { color: #1a365d; font-size: 0.95rem; margin-top: 18px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .badge { background: #fdf6e3; color: #1a365d; border: 1px solid #c9a24a; border-radius: 6px; padding: 3px 10px; font-size: 0.75rem; }
  .meta { font-size: 0.78rem; color: #7a8494; line-height: 1.7; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #1a365d; color: #fff; text-align: left; padding: 7px 12px; font-size: 0.78rem; }
  td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; font-size: 0.82rem; }
  .section { background: #f8fafc; border: 1px solid #dde1e6; border-radius: 8px; padding: 14px 16px; margin: 12px 0; }
  .kpi-row { display: flex; gap: 12px; margin: 14px 0; flex-wrap: wrap; }
  .kpi { background: #eef6ff; border: 1px solid #b3d4fc; border-radius: 6px; padding: 10px 16px; flex: 1; min-width: 140px; }
  .kpi .val { font-size: 1.3rem; font-weight: 700; color: #1a365d; }
  .kpi .lbl { font-size: 0.68rem; color: #555e6b; text-transform: uppercase; letter-spacing: 0.03em; }
  .chart-container { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 12px 0; }
  .chart-title { font-size: 0.85rem; font-weight: 700; color: #1a365d; margin-bottom: 4px; }
  .chart-sub { font-size: 0.72rem; color: #7a8494; margin-bottom: 10px; }
  .conclusion { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin: 12px 0; font-size: 0.82rem; line-height: 1.7; }
  .conclusion strong { color: #166534; }
  .footer { margin-top: 36px; padding-top: 14px; border-top: 2px solid #e5e7eb; font-size: 0.72rem; color: #7a8494; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
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
  <strong>${region.name}</strong> — ${region.subtitle}<br>
  ${region.description}<br>
  <span style="font-size:0.78rem;color:#7a8494;">
    Lat: ${region.bounds.south.toFixed(3)}° a ${region.bounds.north.toFixed(3)}° &nbsp;|&nbsp;
    Lon: ${region.bounds.west.toFixed(3)}° a ${region.bounds.east.toFixed(3)}°
  </span>
</div>

<h2>Mapa de Velocidad — Vista Superior 2D</h2>
<div class="chart-container" style="text-align:center;">
  ${mapTopDown ? `<img src="${mapTopDown}" style="width:380px;height:380px;border-radius:6px;border:1px solid #dde1e6;image-rendering:pixelated;" alt="Mapa velocidad LOS 2D"/>` : '<p style="color:#7a8494;font-size:0.82rem;">[Mapa no disponible]</p>'}
  <div class="chart-sub" style="margin-top:8px;">Mapa 2D de velocidad LOS (mm/año) — Rojo: subsidencia | Blanco: estable | Azul: levantamiento</div>
  <div style="margin:8px auto 0;width:300px;height:14px;border-radius:4px;background:linear-gradient(90deg, #c43c3c 0%, #f5f5f5 50%, #2d5cb8 100%);border:1px solid #dde1e6;"></div>
  <div style="display:flex;justify-content:space-between;width:300px;margin:2px auto 0;font-size:0.68rem;color:#7a8494;">
    <span>-25 mm/a</span><span>0</span><span>+25 mm/a</span>
  </div>
</div>
${canvasDataUrl ? `
<h2>Visualizacion 3D — Perspectiva</h2>
<div class="chart-container" style="text-align:center;">
  <img src="${canvasDataUrl}" style="max-width:100%;border-radius:6px;border:1px solid #dde1e6;" alt="Mapa InSAR 3D"/>
  <div class="chart-sub" style="margin-top:8px;">Vista 3D con exageracion vertical sobre DEM Copernicus GLO-30</div>
</div>
` : ''}

<h2>Resultados Principales</h2>
<div class="kpi-row">
  <div class="kpi"><div class="lbl">Velocidad LOS Media</div><div class="val">${mean} mm/a</div></div>
  <div class="kpi"><div class="lbl">Rango P5–P95</div><div class="val">${p05} / ${p95}</div></div>
  <div class="kpi"><div class="lbl">Area Subsidencia</div><div class="val">${subsidence}%</div></div>
  <div class="kpi"><div class="lbl">Cobertura Coherente</div><div class="val">${coherent}%</div></div>
</div>

<h2>Graficos ISCE2 — Red de Baselines</h2>
<div class="chart-container">
  <div class="chart-title">Red Interferometrica (ISCE2 topsStack)</div>
  <div class="chart-sub">18 adquisiciones Sentinel-1, conexiones short-baseline</div>
  <svg viewBox="0 0 500 80" width="100%" height="70">
    ${Array.from({length: 18}).map((_, i) => {
      const x = 30 + (i / 17) * 440
      const pairs = []
      if (i < 17) pairs.push(`<line x1="${x}" y1="40" x2="${30 + ((i+1)/17)*440}" y2="${35 + Math.random()*10}" stroke="#6366f1" stroke-width="0.8" opacity="0.5"/>`)
      if (i < 16 && i % 2 === 0) pairs.push(`<line x1="${x}" y1="40" x2="${30 + ((i+2)/17)*440}" y2="${32 + Math.random()*16}" stroke="#6366f1" stroke-width="0.6" opacity="0.3"/>`)
      return pairs.join('') + `<circle cx="${x}" cy="40" r="3.5" fill="#1a365d"/>`
    }).join('')}
    <text x="30" y="70" font-size="7" fill="#9ca3af">2023-01</text>
    <text x="450" y="70" font-size="7" fill="#9ca3af" text-anchor="end">2024-12</text>
  </svg>
</div>

<h2>Graficos MintPy — Serie Temporal SBAS</h2>
<div class="chart-container">
  <div class="chart-title">Desplazamiento Acumulado LOS</div>
  <div class="chart-sub">Punto de maxima deformacion — serie temporal 24 meses</div>
  <svg viewBox="0 0 500 200" width="100%" height="160">
    <line x1="40" x2="460" y1="100" y2="100" stroke="#d1d5db" stroke-width="0.5" stroke-dasharray="3,3"/>
    <line x1="40" x2="460" y1="50" y2="50" stroke="#e5e7eb" stroke-width="0.3"/>
    <line x1="40" x2="460" y1="150" y2="150" stroke="#e5e7eb" stroke-width="0.3"/>
    <polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${tsPoints.join(' ')}"/>
    ${tsPoints.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#0d9488" opacity="0.7"/>`).join('')}
    <text x="40" y="195" font-size="8" fill="#9ca3af">2023-01</text>
    <text x="440" y="195" font-size="8" fill="#9ca3af" text-anchor="end">2024-12</text>
    <text x="20" y="104" font-size="7" fill="#9ca3af">0</text>
    <text x="250" y="14" font-size="9" fill="#0d9488" text-anchor="middle" font-weight="600">Velocidad: ${mean} mm/año</text>
  </svg>
</div>

<h2>Graficos MiaplPy — Distribucion de Velocidad PS</h2>
<div class="chart-container">
  <div class="chart-title">Histograma de Velocidad (Persistent Scatterers)</div>
  <div class="chart-sub">Distribucion de pixeles PS por rango de velocidad LOS</div>
  <svg viewBox="0 0 500 140" width="100%" height="120">
    ${hist.map((count, i) => {
      const bw = 420 / bins
      const bh = (count / histMax) * 100
      const x = 40 + i * bw
      const binCenter = vmin + (i + 0.5) * binW
      let color = '#3A7BD5'
      if (binCenter < -10) color = '#D64545'
      else if (binCenter < -3) color = '#F5A673'
      else if (binCenter < 3) color = '#9ca3af'
      else if (binCenter < 10) color = '#8CC8F0'
      return `<rect x="${x}" y="${110 - bh}" width="${bw - 2}" height="${bh}" fill="${color}" opacity="0.8" rx="2"/>`
    }).join('')}
    <line x1="40" x2="460" y1="110" y2="110" stroke="#9ca3af" stroke-width="0.8"/>
    <text x="40" y="125" font-size="7" fill="#9ca3af">${vmin.toFixed(0)} mm/a</text>
    <text x="250" y="125" font-size="7" fill="#9ca3af" text-anchor="middle">0</text>
    <text x="455" y="125" font-size="7" fill="#9ca3af" text-anchor="end">${vmax.toFixed(0)} mm/a</text>
  </svg>
</div>

<h2>Conclusion</h2>
<div class="conclusion">
  <strong>ISCE2:</strong> Se procesaron 18 imagenes Sentinel-1 IW SLC con topsStack, generando ${Math.floor(18 * 1.5)} interferogramas con baseline perpendicular &lt; 250 m. La calidad de unwrapping es adecuada para la cobertura de la zona.<br><br>
  <strong>MintPy (SBAS):</strong> La velocidad media LOS es de ${mean} mm/año con un rango robusto (P5-P95) de ${p05} a ${p95} mm/año. ${parseFloat(subsidence) > 15 ? 'Se detecta subsidencia significativa en la zona.' : 'La deformacion detectada esta dentro de rangos moderados.'}<br><br>
  <strong>MiaplPy (PS):</strong> Los puntos persistentes confirman el patron de deformacion con mayor densidad en areas de alta coherencia (${coherent}% cobertura). ${parseFloat(mean) < -5 ? 'La tendencia negativa indica subsidencia activa que requiere monitoreo continuo.' : 'Los valores son compatibles con estabilidad o deformacion lenta.'}
</div>

<h2>Parametros del Procesamiento</h2>
<div class="two-col">
  <table>
    <tr><th colspan="2">Pipeline InSAR</th></tr>
    <tr><td>Sensor</td><td>Sentinel-1 IW SLC</td></tr>
    <tr><td>Procesador</td><td>ISCE2 topsStack (16 runs)</td></tr>
    <tr><td>Series temporales</td><td>MintPy (SBAS) + MiaplPy (PS)</td></tr>
    <tr><td>Corr. troposferica</td><td>height_correlation</td></tr>
    <tr><td>Corr. DEM</td><td>Euillades (2004)</td></tr>
  </table>
  <table>
    <tr><th colspan="2">Configuracion</th></tr>
    <tr><td>Range looks</td><td>20</td></tr>
    <tr><td>Azimuth looks</td><td>5</td></tr>
    <tr><td>Conexiones</td><td>2 (short baseline)</td></tr>
    <tr><td>Filtro fase</td><td>Goldstein (α=0.8)</td></tr>
    <tr><td>Umbral coherencia</td><td>0.45</td></tr>
  </table>
</div>

<h2>Informacion del Reporte</h2>
<div class="section">
  <table style="font-size:0.82rem;">
    <tr><td style="font-weight:600;width:180px;">Fecha y hora</td><td>${fechaHora}</td></tr>
    <tr><td style="font-weight:600;">Usuario solicitante</td><td>nicolaslanzarini@gmail.com</td></tr>
    <tr><td style="font-weight:600;">Tiempo de calculo</td><td>${computeTime || '—'} segundos (demo — en produccion: 2-4 horas)</td></tr>
    <tr><td style="font-weight:600;">Zona analizada</td><td>${region.name} (${region.subtitle})</td></tr>
    <tr><td style="font-weight:600;">Datos sinteticos</td><td>Si — demo de visualizacion</td></tr>
  </table>
</div>

<div class="footer">
  <strong>SISAR</strong> · Universidad Nacional de Cuyo · CEDIAC · CONICET — Mendoza, Argentina<br>
  Datos: Sentinel-1 SLC (ESA/Copernicus) via Alaska Satellite Facility · DEM Copernicus GLO-30<br>
  Correccion DEM: Euillades, P.A. (2004) · Contacto: @Prueba_Benjabot<br>
  <em>Este reporte fue generado automaticamente por el sistema SISAR Demo v1.0</em>
</div>
</body></html>`

      const win = window.open('', '_blank')
      if (win) {
        win.document.write(htmlContent)
        win.document.close()
        setTimeout(() => win.print(), 600)
      }
      setGeneratingPdf(false)
    }, 1500)
  }, [selectedRegion, computeTime])

  const region = selectedRegion
    ? REGIONS.find(r => r.id === selectedRegion)
    : null

  return (
    <div className="dashboard dashboard-fadein">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-header-left">
          <button className="dash-back-btn" onClick={onBack}>
            ← Inicio
          </button>
          <div className="dash-header-brand">
            <span className="icon">🛰️</span>
            <h1>SISAR <span className="version">Demo v1.0</span></h1>
          </div>
        </div>
        <div className="dash-header-right">
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="dash-telegram-btn"
          >
            <span>📱</span> Telegram Bot
          </a>
          <span><span className="status-dot" /> Sistema activo</span>
          <span>CEDIAC · UNCuyo</span>
        </div>
      </header>

      {/* Content */}
      <div className="dash-content">

        {/* Section 1: Map Selection */}
        <section className="dash-section anim-fadein-up" style={{ animationDelay: '0.05s' }}>
          <div className="dash-section-header">
            <span className="dash-section-number">1</span>
            <h2>Seleccion de Zona de Estudio</h2>
            <span className="subtitle">Seleccione una region en el mapa o elija una zona predefinida</span>
          </div>
          <div className="card">
            <div className="card-body">
              <MapSelector
                selectedRegion={selectedRegion}
                onSelectRegion={onSelectRegion}
              />
              <div className="action-bar">
                <button
                  className="analyze-btn"
                  disabled={!selectedRegion || analyzing}
                  onClick={handleAnalyze}
                >
                  {analyzing ? '⏳ Procesando...' : '▶ Analizar zona seleccionada'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Pipeline */}
        <section className="dash-section anim-fadein-up" style={{ animationDelay: '0.12s' }}>
          <div className="dash-section-header">
            <span className="dash-section-number">2</span>
            <h2>Pipeline de Procesamiento</h2>
            <span className="subtitle">ISCE2 → MintPy/MiaplPy → Productos finales</span>
          </div>
          <div className="card">
            <div className="card-body">
              <ProcessTimeline currentStep={pipelineStep} />
              {analyzing && (
                <div
                  className="anim-fadein-up"
                  style={{
                    textAlign: 'center',
                    marginTop: 12,
                    fontSize: '0.82rem',
                    color: 'var(--teal-600)',
                    fontWeight: 600,
                  }}
                >
                  ⏳ Procesando datos InSAR...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: 3D Visualization */}
        <section className="dash-section anim-fadein-up" style={{ animationDelay: '0.18s' }}>
          <div className="dash-section-header">
            <span className="dash-section-number">3</span>
            <h2>Visualizacion 3D — Productos MintPy / MiaplPy</h2>
            <span className="subtitle">
              {region ? `${region.name} — Velocidad LOS y fase interferometrica` : 'Seleccione una zona para visualizar'}
            </span>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="viewer-grid">
                <div className="viewer-canvas">
                  <TerrainViewer
                    region={region}
                    viewMode={viewMode}
                    exaggeration={exaggeration}
                    isReady={analysisComplete}
                  />
                  {region && analysisComplete && (
                    <div className="viewer-overlay">
                      <strong>{region.name}</strong> — {region.subtitle}<br />
                      Modo: {viewMode === 'velocity' ? 'Velocidad LOS (mm/a) — MintPy' : 'Interferograma — ISCE2'}<br />
                      Exageracion vertical: {exaggeration.toFixed(1)}x
                    </div>
                  )}
                </div>
                <div className="viewer-controls">
                  <div className="viewer-control-group">
                    <label>Producto InSAR</label>
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value)}
                    >
                      <option value="velocity">Velocidad LOS — MintPy (mm/año)</option>
                      <option value="interferogram">Interferograma — ISCE2 (franjas)</option>
                    </select>
                  </div>
                  <div className="viewer-control-group">
                    <label>Exageracion vertical: {exaggeration.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="4"
                      step="0.1"
                      value={exaggeration}
                      onChange={(e) => setExaggeration(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="viewer-control-group">
                    <div className="colorbar">
                      <div className="colorbar-title">
                        {viewMode === 'velocity' ? 'Velocidad LOS (MintPy)' : 'Fase interferometrica (ISCE2)'}
                      </div>
                      <div
                        className="colorbar-gradient"
                        style={{
                          background: viewMode === 'velocity'
                            ? 'linear-gradient(90deg, #7A0E0E 0%, #D64545 20%, #F5A673 40%, #F5F5F5 50%, #8CC8F0 60%, #3A7BD5 80%, #0B2A6B 100%)'
                            : 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                        }}
                      />
                      <div className="colorbar-labels">
                        {viewMode === 'velocity' ? (
                          <>
                            <span>-25 mm/a</span>
                            <span>0</span>
                            <span>+25 mm/a</span>
                          </>
                        ) : (
                          <>
                            <span>0</span>
                            <span>π</span>
                            <span>2π</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="viewer-control-group" style={{ marginTop: 'auto' }}>
                    <label>Informacion</label>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', lineHeight: 1.6 }}>
                      <p>Use el mouse para rotar (click + arrastrar), hacer zoom (scroll) y desplazar (click derecho + arrastrar).</p>
                      {region && (
                        <p style={{ marginTop: 8 }}>
                          <strong>Zona:</strong> {region.name}<br />
                          <strong>Lat:</strong> {region.bounds.south.toFixed(2)} a {region.bounds.north.toFixed(2)}<br />
                          <strong>Lon:</strong> {region.bounds.west.toFixed(2)} a {region.bounds.east.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: InSAR Products — MintPy / MiaplPy (NEW - protagonismo) */}
        {analysisComplete && region && (
          <section className="dash-section anim-fadein-up">
            <div className="dash-section-header">
              <span className="dash-section-number">4</span>
              <h2>Productos InSAR — ISCE2 / MintPy / MiaplPy</h2>
              <span className="subtitle">Graficos y metricas de los procesadores principales</span>
            </div>
            <div className="card">
              <div className="card-body">
                <InSARProducts region={region} />
              </div>
            </div>
          </section>
        )}

        {/* Section 5: Results + Statistics */}
        {analysisComplete && region && (
          <section className="dash-section anim-fadein-up" ref={resultsRef}>
            <div className="dash-section-header">
              <span className="dash-section-number">5</span>
              <h2>Resultados del Analisis</h2>
              <span className="subtitle">
                {region.name} — {region.subtitle}
                {computeTime && <span style={{ marginLeft: 12, color: 'var(--teal-600)', fontSize: '0.82rem' }}>⏱ {computeTime}s</span>}
              </span>
            </div>
            <AnalysisPanel region={region} />

            {/* DEM correction — compact note */}
            <div style={{ marginTop: 16 }}>
              <DEMCorrection />
            </div>

            {/* Action buttons: Telegram + PDF */}
            <div className="action-bar" style={{ marginTop: 20 }}>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-telegram"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Contactar via Telegram
              </a>
              <button
                className="btn-pdf"
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
              >
                {generatingPdf ? (
                  '⏳ Generando reporte...'
                ) : (
                  <>📄 Descargar Reporte PDF</>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Section 6: About SISAR Bolsillo / App Pocket */}
        <section className="dash-section anim-fadein-up" style={{ animationDelay: '0.25s' }}>
          <div className="dash-section-header">
            <span className="dash-section-number">6</span>
            <h2>SISAR de Bolsillo — Version Liviana</h2>
            <span className="subtitle">App pre-procesada para demostraciones sin infraestructura Docker</span>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 10 }}>
                    Que es SISAR de Bolsillo?
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 12 }}>
                    Es una version simplificada del sistema SISAR que funciona
                    <strong> sin Docker, sin ISCE2 y sin los 100+ GB</strong> de
                    dependencias del pipeline completo. Genera datos InSAR sinteticos
                    en tiempo real con la misma interfaz visual que el sistema de produccion.
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 12 }}>
                    Ideal para presentaciones a clientes, demostraciones academicas
                    y evaluacion de la interfaz de usuario antes de conectar el
                    pipeline real.
                  </p>

                  <div style={{
                    background: 'var(--gold-100)',
                    border: '1px solid rgba(201,162,74,0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginTop: 14,
                  }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>
                      <strong>Tecnologias:</strong> Python + Streamlit + Plotly + NumPy + SciPy<br />
                      <strong>Puerto:</strong> 8503 (V2 nueva) / 8504 (V1 original)<br />
                      <strong>Inicio:</strong> Doble clic en <code style={{ background: 'var(--gray-200)', padding: '1px 5px', borderRadius: 3 }}>INICIAR.bat</code>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 10 }}>
                    Funcionalidades del App Pocket
                  </h3>
                  <table className="dem-table">
                    <thead>
                      <tr>
                        <th>Funcionalidad</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Globo 3D interactivo (octante SW)</td><td style={{ color: 'var(--teal-600)', fontWeight: 600 }}>✓ Activo</td></tr>
                      <tr><td>Selector de cuadrante (grilla 4×4)</td><td style={{ color: 'var(--teal-600)', fontWeight: 600 }}>✓ Activo</td></tr>
                      <tr><td>Mapa 3D de velocidad LOS</td><td style={{ color: 'var(--teal-600)', fontWeight: 600 }}>✓ Activo</td></tr>
                      <tr><td>Interferograma 3D (fase HSV)</td><td style={{ color: 'var(--teal-600)', fontWeight: 600 }}>✓ Activo</td></tr>
                      <tr><td>Serie temporal SBAS</td><td style={{ color: 'var(--teal-600)', fontWeight: 600 }}>✓ Activo</td></tr>
                      <tr><td>Analisis subsidencia (YPF)</td><td style={{ color: 'var(--teal-600)', fontWeight: 600 }}>✓ Activo</td></tr>
                      <tr><td>Datos reales Sentinel-1</td><td style={{ color: 'var(--gold-500)', fontWeight: 600 }}>En desarrollo</td></tr>
                      <tr><td>Bot Telegram de alertas</td><td style={{ color: 'var(--gold-500)', fontWeight: 600 }}>En desarrollo</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="dash-footer">
        <p>
          <strong>SISAR</strong> · Universidad Nacional de Cuyo · CEDIAC · CONICET — Mendoza, Argentina<br />
          Datos: Sentinel-1 SLC (ESA/Copernicus) via{' '}
          <a href="https://search.asf.alaska.edu" target="_blank" rel="noreferrer">
            Alaska Satellite Facility
          </a>
          &nbsp;·&nbsp; DEM Copernicus GLO-30
          &nbsp;·&nbsp; Correccion DEM: Euillades (2004)
        </p>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.78rem',
              color: '#0088cc',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            📱 Bot Telegram: @Prueba_Benjabot
          </a>
        </div>
      </footer>
    </div>
  )
}
