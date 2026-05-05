import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { generateInSAR } from '../utils/terrain'

export default function AnalysisPanel({ region }) {
  // Compute synthetic statistics from the InSAR data
  const stats = useMemo(() => {
    const insar = generateInSAR(64, 64, region.bounds, region.seed)
    let sum = 0, count = 0, minVal = Infinity, maxVal = -Infinity
    const valid = []

    for (let i = 0; i < insar.length; i++) {
      if (!isNaN(insar[i])) {
        sum += insar[i]
        count++
        if (insar[i] < minVal) minVal = insar[i]
        if (insar[i] > maxVal) maxVal = insar[i]
        valid.push(insar[i])
      }
    }

    valid.sort((a, b) => a - b)
    const mean = sum / count
    const p05 = valid[Math.floor(valid.length * 0.05)]
    const p95 = valid[Math.floor(valid.length * 0.95)]
    const subsidence = valid.filter(v => v < -5).length / valid.length * 100
    const coherent = count / insar.length * 100

    return {
      mean: mean.toFixed(2),
      min: minVal.toFixed(1),
      max: maxVal.toFixed(1),
      p05: p05.toFixed(1),
      p95: p95.toFixed(1),
      subsidence: subsidence.toFixed(1),
      coherent: coherent.toFixed(1),
      totalPixels: insar.length,
      validPixels: count,
    }
  }, [region])

  const kpis = [
    {
      label: 'Velocidad LOS media',
      value: `${stats.mean > 0 ? '+' : ''}${stats.mean}`,
      unit: 'mm/anio',
      sub: 'Promedio espacial sobre la ROI',
      cls: parseFloat(stats.mean) < 0 ? 'negative' : 'positive',
    },
    {
      label: 'Rango P5 - P95',
      value: `${stats.p05} / ${stats.p95}`,
      unit: 'mm/anio',
      sub: 'Percentiles robustos de velocidad',
      cls: '',
    },
    {
      label: 'Area con subsidencia',
      value: stats.subsidence,
      unit: '%',
      sub: 'Pixeles con vel. < -5 mm/anio',
      cls: parseFloat(stats.subsidence) > 20 ? 'negative' : '',
    },
    {
      label: 'Cobertura coherente',
      value: stats.coherent,
      unit: '%',
      sub: `${stats.validPixels} / ${stats.totalPixels} pixeles validos`,
      cls: parseFloat(stats.coherent) > 90 ? 'positive' : '',
    },
  ]

  return (
    <div>
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="kpi-card"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            <div className="kpi-label">{kpi.label}</div>
            <div className={`kpi-value ${kpi.cls}`}>
              {kpi.value} <span className="kpi-unit">{kpi.unit}</span>
            </div>
            <div className="kpi-sub">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Interpretation block */}
      <motion.div
        className="card"
        style={{ marginTop: 16 }}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 10 }}>
              Interpretacion
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 8 }}>
                <strong>Subsidencia detectada:</strong> Zonas con velocidad negativa
                (rojo en el mapa) indican hundimiento del terreno. En contexto de{' '}
                {region.type === 'subsidencia' && 'explotacion no convencional (fracking), esto puede deberse a compactacion del reservorio.'}
                {region.type === 'volcanico' && 'actividad volcanica, esto puede deberse a desgasificacion o movimiento de magma.'}
                {region.type === 'tectonico' && 'actividad tectonica, esto puede deberse a movimiento de fallas activas.'}
                {region.type === 'urbano' && 'areas urbanas, esto puede deberse a extraccion de agua subterranea o consolidacion de suelos.'}
              </p>
              <p>
                <strong>Levantamiento:</strong> Zonas azules indican movimiento
                ascendente. Valores entre -2 y +2 mm/anio se consideran dentro
                del rango de estabilidad del metodo.
              </p>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 10 }}>
              Parametros del procesamiento
            </h3>
            <table style={{ fontSize: '0.78rem', color: 'var(--gray-600)', width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Sensor', 'Sentinel-1 IW SLC'],
                  ['Procesador', 'ISCE2 topsStack'],
                  ['Series temporales', 'MintPy (SBAS)'],
                  ['Corr. troposferica', 'height_correlation'],
                  ['Corr. DEM', 'Euillades (2004)'],
                  ['Range looks', '20'],
                  ['Azimuth looks', '5'],
                  ['Conexiones', '2 (short baseline)'],
                ].map(([key, val]) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '5px 8px 5px 0', fontWeight: 600, color: 'var(--gray-700)' }}>{key}</td>
                    <td style={{ padding: '5px 0', fontFamily: 'Consolas, monospace', color: 'var(--teal-600)' }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
