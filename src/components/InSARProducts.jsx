import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { generateInSAR } from '../utils/terrain'

/**
 * Componente principal de productos InSAR — MintPy / MiaplPy
 * Muestra graficos sinteticos representativos de los outputs del pipeline.
 */
export default function InSARProducts({ region }) {
  // Generate synthetic data for the mini-charts
  const chartData = useMemo(() => {
    const insar = generateInSAR(32, 32, region.bounds, region.seed)
    const valid = insar.filter(v => !isNaN(v))
    valid.sort((a, b) => a - b)

    // Histogram bins
    const bins = 20
    const min = valid[0], max = valid[valid.length - 1]
    const binWidth = (max - min) / bins
    const histogram = new Array(bins).fill(0)
    valid.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1)
      histogram[idx]++
    })
    const histMax = Math.max(...histogram)

    // Synthetic time series (cumulative displacement)
    const nDates = 24
    const timeSeries = []
    let cumDisp = 0
    const rate = parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2))
    for (let i = 0; i < nDates; i++) {
      cumDisp += (rate / 12) + (Math.random() - 0.5) * 1.5
      timeSeries.push({ month: i, disp: cumDisp })
    }

    // Synthetic baseline network
    const nImages = 18
    const pairs = []
    for (let i = 0; i < nImages - 1; i++) {
      pairs.push({ m: i, s: i + 1, bperp: (Math.random() - 0.5) * 200 })
      if (i + 2 < nImages && Math.random() > 0.4) {
        pairs.push({ m: i, s: i + 2, bperp: (Math.random() - 0.5) * 250 })
      }
    }

    return { histogram, histMax, bins, min, max, binWidth, timeSeries, nDates, pairs, nImages, rate }
  }, [region])

  const products = [
    {
      title: 'Mapa de Velocidad LOS',
      source: 'MintPy — SBAS',
      description: 'Velocidad media en linea de vista (mm/año) calculada por Small Baseline Series. Negativo = subsidencia, Positivo = levantamiento.',
      icon: '🗺️',
      color: '#0d9488',
    },
    {
      title: 'Interferograma Diferencial',
      source: 'ISCE2 — topsStack',
      description: 'Fase interferometrica envuelta generada por ISCE2. Cada franja de color representa ~28 mm de desplazamiento en LOS (λ/2 banda C).',
      icon: '🌈',
      color: '#6366f1',
    },
    {
      title: 'Mapa de Coherencia',
      source: 'ISCE2 + MintPy',
      description: 'Coherencia temporal media. Valores altos (>0.7) indican pixeles confiables para el analisis de series temporales.',
      icon: '📊',
      color: '#d97706',
    },
    {
      title: 'Velocidad PS (Persistent Scatterers)',
      source: 'MiaplPy',
      description: 'Velocidad de puntos persistentes identificados por MiaplPy. Mayor densidad de PS en areas urbanas y rocas expuestas.',
      icon: '📍',
      color: '#dc2626',
    },
  ]

  return (
    <div>
      {/* Product cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {products.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            style={{
              background: '#fff',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              borderTop: `3px solid ${p.color}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: p.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {p.source}
              </span>
            </div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 6 }}>
              {p.title}
            </h4>
            <p style={{ fontSize: '0.76rem', color: 'var(--gray-600)', lineHeight: 1.5, margin: 0 }}>
              {p.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Time Series Chart */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          style={{
            background: '#fff',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
          }}
        >
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 4 }}>
            Serie Temporal — MintPy SBAS
          </h4>
          <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 12 }}>
            Desplazamiento acumulado LOS (mm) — punto de maxima deformacion
          </p>
          <svg viewBox="0 0 300 120" style={{ width: '100%', height: 120 }}>
            {/* Grid lines */}
            {[0, 30, 60, 90, 120].map(y => (
              <line key={y} x1="30" x2="290" y1={y} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
            ))}
            {/* Axis */}
            <line x1="30" x2="30" y1="0" y2="120" stroke="#9ca3af" strokeWidth="0.8" />
            <line x1="30" x2="290" y1="60" y2="60" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="2,2" />
            {/* Data polyline */}
            <polyline
              fill="none"
              stroke="#0d9488"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartData.timeSeries.map((d, i) => {
                const x = 30 + (i / (chartData.nDates - 1)) * 260
                const yScale = 2.5
                const y = 60 - d.disp * yScale
                return `${x},${Math.max(5, Math.min(115, y))}`
              }).join(' ')}
            />
            {/* Points */}
            {chartData.timeSeries.map((d, i) => {
              const x = 30 + (i / (chartData.nDates - 1)) * 260
              const y = Math.max(5, Math.min(115, 60 - d.disp * 2.5))
              return <circle key={i} cx={x} cy={y} r="2.5" fill="#0d9488" opacity="0.7" />
            })}
            {/* Labels */}
            <text x="30" y="118" fontSize="7" fill="#9ca3af">2023-01</text>
            <text x="260" y="118" fontSize="7" fill="#9ca3af">2024-12</text>
            <text x="5" y="63" fontSize="6" fill="#9ca3af">0</text>
            <text x="150" y="10" fontSize="7" fill="#0d9488" textAnchor="middle" fontWeight="600">
              Vel: {chartData.rate.toFixed(1)} mm/año
            </text>
          </svg>
        </motion.div>

        {/* Velocity Histogram */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          style={{
            background: '#fff',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
          }}
        >
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 4 }}>
            Histograma de Velocidad LOS
          </h4>
          <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 12 }}>
            Distribucion de pixeles por rango de velocidad (mm/año)
          </p>
          <svg viewBox="0 0 300 120" style={{ width: '100%', height: 120 }}>
            {/* Bars */}
            {chartData.histogram.map((count, i) => {
              const barW = 260 / chartData.bins
              const barH = (count / chartData.histMax) * 100
              const x = 30 + i * barW
              const y = 110 - barH
              // Color based on bin center value
              const binCenter = chartData.min + (i + 0.5) * chartData.binWidth
              let barColor = '#3A7BD5'
              if (binCenter < -10) barColor = '#D64545'
              else if (binCenter < -3) barColor = '#F5A673'
              else if (binCenter < 3) barColor = '#9ca3af'
              else if (binCenter < 10) barColor = '#8CC8F0'
              return (
                <rect key={i} x={x} y={y} width={barW - 1} height={barH}
                  fill={barColor} opacity="0.8" rx="1" />
              )
            })}
            {/* Axis */}
            <line x1="30" x2="290" y1="110" y2="110" stroke="#9ca3af" strokeWidth="0.8" />
            {/* Labels */}
            <text x="30" y="118" fontSize="7" fill="#9ca3af">{chartData.min.toFixed(0)}</text>
            <text x="155" y="118" fontSize="7" fill="#9ca3af" textAnchor="middle">0</text>
            <text x="285" y="118" fontSize="7" fill="#9ca3af" textAnchor="end">{chartData.max.toFixed(0)}</text>
            <text x="160" y="8" fontSize="7" fill="#555e6b" textAnchor="middle">mm/año</text>
          </svg>
        </motion.div>
      </div>

      {/* Baseline network mini */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.45 }}
        style={{
          marginTop: 16,
          background: '#fff',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: 2 }}>
              Red de Baselines — ISCE2 topsStack
            </h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--gray-500)', margin: 0 }}>
              Conexiones interferometricas entre adquisiciones Sentinel-1
            </p>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)', textAlign: 'right' }}>
            <strong>{chartData.nImages}</strong> imagenes · <strong>{chartData.pairs.length}</strong> pares
          </div>
        </div>
        <svg viewBox="0 0 500 80" style={{ width: '100%', height: 70 }}>
          {/* Connections */}
          {chartData.pairs.map((pair, i) => {
            const x1 = 20 + (pair.m / (chartData.nImages - 1)) * 460
            const x2 = 20 + (pair.s / (chartData.nImages - 1)) * 460
            const y1 = 40 + pair.bperp * 0.12
            const y2 = 40 + pair.bperp * 0.08
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#6366f1" strokeWidth="0.8" opacity="0.5" />
            )
          })}
          {/* Image dots */}
          {Array.from({ length: chartData.nImages }).map((_, i) => {
            const x = 20 + (i / (chartData.nImages - 1)) * 460
            return <circle key={i} cx={x} cy={40} r="3" fill="#1a365d" />
          })}
          {/* Labels */}
          <text x="20" y="75" fontSize="7" fill="#9ca3af">T₀</text>
          <text x="470" y="75" fontSize="7" fill="#9ca3af" textAnchor="end">T₁₇</text>
          <text x="250" y="12" fontSize="7" fill="#6366f1" textAnchor="middle">Bperp (m)</text>
        </svg>
      </motion.div>
    </div>
  )
}
