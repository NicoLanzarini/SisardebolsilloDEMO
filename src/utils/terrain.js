/* ================================================================
 * terrain.js — Generador de terreno e InSAR sintético realista
 * SISAR Demo · CEDIAC · UNCuyo
 *
 * Genera datos sintéticos que simulan:
 *   - Relieve andino con múltiples octavas de ruido
 *   - Deformación InSAR (subsidencia, levantamiento)
 *   - Interferogramas con franjas de fase
 *   - Ruido atmosférico y decorrelación realistas
 * ================================================================ */

// ── Ruido basado en hash (value noise) ──────────────────────────
function hash(x, y, seed) {
  let h = seed + x * 374761393 + y * 668265263
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

function smoothNoise(x, y, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = hash(ix, iy, seed)
  const n10 = hash(ix + 1, iy, seed)
  const n01 = hash(ix, iy + 1, seed)
  const n11 = hash(ix + 1, iy + 1, seed)
  return (n00 + sx * (n10 - n00)) + sy * ((n01 + sx * (n11 - n01)) - (n00 + sx * (n10 - n00)))
}

export function fbm(x, y, octaves = 6, seed = 42) {
  let value = 0, amplitude = 1, frequency = 1, maxVal = 0
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (smoothNoise(x * frequency, y * frequency, seed + i * 1337) * 2 - 1)
    maxVal += amplitude
    amplitude *= 0.48
    frequency *= 2.1
  }
  return value / maxVal
}

// ── Generador de terreno ────────────────────────────────────────
export function generateTerrain(width, height, bounds, seed = 42) {
  const { south, north, west, east } = bounds
  const data = new Float32Array(width * height)
  const latRange = north - south
  const lonRange = east - west

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const u = i / (width - 1)
      const v = j / (height - 1)
      const lat = south + v * latRange
      const lon = west + u * lonRange

      // Terreno base: montañas andinas
      let elev = 0
      elev += fbm(lon * 3, lat * 3, 5, seed) * 1800
      elev += fbm(lon * 8, lat * 8, 4, seed + 100) * 600
      elev += fbm(lon * 20, lat * 20, 3, seed + 200) * 150
      elev += fbm(lon * 50, lat * 50, 2, seed + 300) * 40

      // Sesgo altitudinal hacia el oeste (cordillera)
      const westBias = Math.pow(1 - u, 1.5) * 1200
      elev += westBias

      // Base elevation
      elev += 1500

      // Valles (clamp mínimo)
      elev = Math.max(elev, 400)

      data[j * width + i] = elev
    }
  }
  return data
}

// ── Generador de deformación InSAR ──────────────────────────────
export function generateInSAR(width, height, bounds, seed = 42) {
  const { south, north, west, east } = bounds
  const data = new Float32Array(width * height)
  const latRange = north - south
  const lonRange = east - west
  const cLat = (south + north) / 2
  const cLon = (west + east) / 2

  // Centros de deformación (subsidencia y levantamiento)
  const deformations = [
    { lat: cLat - latRange * 0.1, lon: cLon + lonRange * 0.05, amp: -18, sigma: 0.15 },
    { lat: cLat + latRange * 0.2, lon: cLon - lonRange * 0.15, amp: -12, sigma: 0.10 },
    { lat: cLat - latRange * 0.25, lon: cLon + lonRange * 0.2, amp: 6, sigma: 0.08 },
    { lat: cLat + latRange * 0.05, lon: cLon - lonRange * 0.3, amp: -8, sigma: 0.12 },
  ]

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const u = i / (width - 1)
      const v = j / (height - 1)
      const lat = south + v * latRange
      const lon = west + u * lonRange

      let val = 0

      // Fuentes de deformación (Gaussianas)
      for (const d of deformations) {
        const dlat = (lat - d.lat) / latRange
        const dlon = (lon - d.lon) / lonRange
        const dist2 = dlat * dlat + dlon * dlon
        val += d.amp * Math.exp(-dist2 / (2 * d.sigma * d.sigma))
      }

      // Tendencia regional suave (rampa orbital)
      val += fbm(lon * 2, lat * 2, 2, seed + 500) * 2.5

      // Ruido atmosférico (baja frecuencia, amplitud moderada)
      val += fbm(lon * 6, lat * 6, 3, seed + 600) * 3.0

      // Ruido de decorrelación (alta frecuencia, baja amplitud)
      val += fbm(lon * 40, lat * 40, 2, seed + 700) * 1.2

      // Decorrelación aleatoria (NaN para algunos píxeles)
      const decorr = hash(i, j, seed + 999)
      if (decorr > 0.97) {
        data[j * width + i] = NaN
      } else {
        data[j * width + i] = val
      }
    }
  }
  return data
}

// ── Colormap: velocidad InSAR ───────────────────────────────────
// Rojo (subsidencia) → Blanco (estable) → Azul (levantamiento)
export function velocityColor(value, vmin = -25, vmax = 25) {
  if (isNaN(value)) return [0.85, 0.85, 0.85]
  const t = Math.max(0, Math.min(1, (value - vmin) / (vmax - vmin)))

  // Paleta divergente profesional
  const stops = [
    { t: 0.00, r: 0.48, g: 0.05, b: 0.05 },  // rojo oscuro
    { t: 0.20, r: 0.84, g: 0.27, b: 0.27 },  // rojo
    { t: 0.40, r: 0.96, g: 0.65, b: 0.45 },  // naranja claro
    { t: 0.50, r: 0.96, g: 0.96, b: 0.96 },  // blanco
    { t: 0.60, r: 0.55, g: 0.78, b: 0.94 },  // celeste
    { t: 0.80, r: 0.23, g: 0.48, b: 0.84 },  // azul
    { t: 1.00, r: 0.04, g: 0.16, b: 0.42 },  // azul oscuro
  ]

  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  const f = (t - lo.t) / (hi.t - lo.t)
  return [
    lo.r + f * (hi.r - lo.r),
    lo.g + f * (hi.g - lo.g),
    lo.b + f * (hi.b - lo.b),
  ]
}

// ── Colormap: interferograma (franjas de fase) ──────────────────
export function interferogramColor(value) {
  if (isNaN(value)) return [0.85, 0.85, 0.85]
  // Wrapping a 2π (simula franjas)
  const phase = ((value % 28.3) + 28.3) % 28.3  // ~λ/2 para banda C
  const t = phase / 28.3

  // Espectro arcoíris profesional
  const h = t * 360
  return hslToRgb(h, 0.75, 0.5)
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r, g, b
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return [r + m, g + m, b + m]
}

// ── Regiones predefinidas ───────────────────────────────────────
export const REGIONS = [
  {
    id: 'vaca-muerta',
    name: 'Vaca Muerta',
    subtitle: 'Neuquen, Argentina',
    description: 'Zona de fracking - Subsidencia por extraccion de shale gas. Monitoreo de compactacion del reservorio y sismicidad inducida.',
    bounds: { south: -38.8, north: -38.2, west: -69.2, east: -68.4 },
    center: [-38.5, -68.8],
    type: 'subsidencia',
    seed: 42,
  },
  {
    id: 'mendoza',
    name: 'Gran Mendoza',
    subtitle: 'Mendoza, Argentina',
    description: 'Area urbana - Monitoreo de infraestructura critica, estabilidad de suelos y riesgo sismico en zona precordillerana.',
    bounds: { south: -33.1, north: -32.6, west: -69.0, east: -68.3 },
    center: [-32.85, -68.65],
    type: 'urbano',
    seed: 123,
  },
  {
    id: 'tupungato',
    name: 'Volcan Tupungato',
    subtitle: 'Cordillera de los Andes',
    description: 'Actividad volcanica - Deformacion del suelo asociada a procesos magmaticos en estratovolcan activo.',
    bounds: { south: -33.5, north: -33.1, west: -69.9, east: -69.5 },
    center: [-33.3, -69.7],
    type: 'volcanico',
    seed: 777,
  },
  {
    id: 'san-juan',
    name: 'Precordillera San Juan',
    subtitle: 'San Juan, Argentina',
    description: 'Zona sismica activa - Monitoreo de fallas geologicas y deformacion tectonica en ambiente de subduccion.',
    bounds: { south: -31.8, north: -31.2, west: -69.5, east: -68.8 },
    center: [-31.5, -69.15],
    type: 'tectonico',
    seed: 555,
  },
]
