/* ================================================================
 * mockDatabase.js — Simulación de base de datos InSAR CEDIAC
 * Datos sintéticos pre-procesados para demostración
 * ================================================================ */

import { generateInSAR } from './terrain'

// Genera puntos de medición distribuidos en una zona
function generateMeasurementPoints(region, count = 60) {
  const { south, north, west, east } = region.bounds
  const seed = region.seed
  const points = []

  // Distribución irregular (más densa en zonas de subsidencia)
  for (let i = 0; i < count; i++) {
    // Pseudo-random usando seed
    const h1 = Math.abs(Math.sin((seed + i * 7919) * 0.001))
    const h2 = Math.abs(Math.cos((seed + i * 6271) * 0.001))
    const lat = south + h1 * (north - south)
    const lon = west  + h2 * (east  - west)

    // Velocidad sintética con variación espacial realista
    const dx = (lon - (west + east) / 2) / (east - west)
    const dy = (lat - (south + north) / 2) / (north - south)
    const dist = Math.sqrt(dx * dx + dy * dy)
    const base = region.type === 'subsidencia' ? -8 : region.type === 'urbano' ? -4 : -2
    const vel = base - dist * 8 + (Math.sin(seed * 0.01 + i) * 3)
    const coherence = 0.55 + Math.abs(Math.sin(seed + i * 1.3)) * 0.42

    // Serie temporal (mensual, 2015-2025)
    const nDates = 120 // 10 años
    const timeSeries = []
    let cum = 0
    const startYear = 2015.0
    for (let t = 0; t < nDates; t++) {
      const noise = (Math.sin(seed * 0.1 + i + t * 0.7) * 1.8)
      const seasonal = Math.sin(t * Math.PI / 6) * 1.5 // ciclo anual
      cum += (vel / 12) + noise * 0.3 + seasonal * 0.05
      timeSeries.push({
        time: startYear + t / 12,
        disp: parseFloat(cum.toFixed(3)),
      })
    }

    points.push({
      id: `${region.id}-pt-${i}`,
      lat: parseFloat(lat.toFixed(5)),
      lon: parseFloat(lon.toFixed(5)),
      velocity: parseFloat(vel.toFixed(3)),
      coherence: parseFloat(coherence.toFixed(3)),
      timeSeries,
    })
  }
  return points
}

// Regiones con metadatos de procesamiento
export const PROCESSED_ZONES = [
  {
    id: 'vaca-muerta',
    name: 'Vaca Muerta',
    subtitle: 'Neuquén, Argentina',
    description: 'Zona de fracking — Subsidencia por extracción de shale gas',
    bounds: { south: -38.8, north: -38.2, west: -69.2, east: -68.4 },
    center: [-38.5, -68.8],
    type: 'subsidencia',
    seed: 42,
    processed: true,
    lastUpdate: '2025-04-20',
    nImages: 143,
    dateRange: '2015-01 — 2025-01',
    sensor: 'Sentinel-1 A/B',
    track: 'Ascending 83',
    meanVel: -6.8,
    maxSubsidence: -18.4,
    geojsonLayers: ['areas', 'shale_c_nqn', 'tight_c_nqn'],
  },
  {
    id: 'mendoza',
    name: 'Gran Mendoza',
    subtitle: 'Mendoza, Argentina',
    description: 'Área urbana — Monitoreo de infraestructura y riesgo sísmico',
    bounds: { south: -33.1, north: -32.6, west: -69.0, east: -68.3 },
    center: [-32.85, -68.65],
    type: 'urbano',
    seed: 123,
    processed: true,
    lastUpdate: '2025-03-15',
    nImages: 87,
    dateRange: '2018-06 — 2025-01',
    sensor: 'Sentinel-1 A/B',
    track: 'Descending 156',
    meanVel: -3.2,
    maxSubsidence: -9.1,
    geojsonLayers: ['areas'],
  },
  {
    id: 'tupungato',
    name: 'Volcán Tupungato',
    subtitle: 'Cordillera de los Andes',
    description: 'Actividad volcánica — Deformación asociada a procesos magmáticos',
    bounds: { south: -33.5, north: -33.1, west: -69.9, east: -69.5 },
    center: [-33.3, -69.7],
    type: 'volcanico',
    seed: 77,
    processed: true,
    lastUpdate: '2025-01-10',
    nImages: 68,
    dateRange: '2016-03 — 2024-12',
    sensor: 'Sentinel-1 A',
    track: 'Ascending 83',
    meanVel: -1.1,
    maxSubsidence: -4.8,
    geojsonLayers: ['areas'],
  },
  {
    id: 'precordillera',
    name: 'Precordillera San Juan',
    subtitle: 'San Juan, Argentina',
    description: 'Zona sísmica — Monitoreo de fallas geológicas activas',
    bounds: { south: -31.8, north: -31.2, west: -69.5, east: -68.8 },
    center: [-31.5, -69.15],
    type: 'tectonico',
    seed: 201,
    processed: false, // zona no procesada aún
    lastUpdate: null,
    nImages: 0,
    dateRange: null,
    sensor: null,
    track: null,
    meanVel: null,
    maxSubsidence: null,
    geojsonLayers: [],
  },
]

// Cache de puntos de medición (se genera lazy)
const _pointsCache = {}

export function getZonePoints(zoneId) {
  if (!_pointsCache[zoneId]) {
    const zone = PROCESSED_ZONES.find(z => z.id === zoneId)
    if (!zone || !zone.processed) return []
    _pointsCache[zoneId] = generateMeasurementPoints(zone, 60)
  }
  return _pointsCache[zoneId]
}

export function getZone(zoneId) {
  return PROCESSED_ZONES.find(z => z.id === zoneId) || null
}
