import React, { useMemo, useEffect, useState, useCallback } from 'react'
import {
  MapContainer, TileLayer, Rectangle,
  ImageOverlay, useMap, useMapEvent,
  CircleMarker, Tooltip,
} from 'react-leaflet'
import { PROCESSED_ZONES, getZonePoints } from '../utils/mockDatabase'
import { generateInSAR, velocityColor, interferogramColor } from '../utils/terrain'
import TimeSeriesPopup from './TimeSeriesPopup'

/* ── Tile layers disponibles ────────────────────────────────────── */
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, USGS, NOAA',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
}

/* ── Hook: zoom actual del mapa ─────────────────────────────────── */
function useZoom() {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvent('zoom', () => setZoom(map.getZoom()))
  return zoom
}

/* ── Fly to region ──────────────────────────────────────────────── */
function FlyTo({ region }) {
  const map = useMap()
  useEffect(() => {
    if (!region) return
    const b = region.bounds
    map.flyToBounds([[b.south, b.west], [b.north, b.east]], { padding: [40, 40], duration: 1.0 })
  }, [region, map])
  return null
}

/* ── Genera imagen canvas con colores InSAR ─────────────────────── */
function useOverlayImage(zone, viewMode) {
  return useMemo(() => {
    if (!zone || !zone.processed) return null
    const W = 256, H = 256
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    const data = generateInSAR(W, H, zone.bounds, zone.seed)
    const colorFn = viewMode === 'interferogram' ? interferogramColor : velocityColor
    const imgData = ctx.createImageData(W, H)
    for (let i = 0; i < data.length; i++) {
      const [r, g, b] = colorFn(data[i])
      imgData.data[i * 4]     = Math.round(r * 255)
      imgData.data[i * 4 + 1] = Math.round(g * 255)
      imgData.data[i * 4 + 2] = Math.round(b * 255)
      imgData.data[i * 4 + 3] = 210
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL()
  }, [zone, viewMode])
}

/* ── Markers con zoom adaptativo ────────────────────────────────── */
function ZoneMarkers({ zone, zoom, onPointClick, selectedPointId }) {
  if (!zone.processed) return null

  const points = useMemo(() => getZonePoints(zone.id), [zone.id])

  // Zoom bajo: un único círculo cluster con total
  if (zoom < 7) {
    const cx = (zone.bounds.south + zone.bounds.north) / 2
    const cy = (zone.bounds.west + zone.bounds.east) / 2
    return (
      <CircleMarker
        center={[cx, cy]}
        radius={20}
        pathOptions={{ color: '#1a365d', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 2 }}
        eventHandlers={{ click: () => {} }}
      >
        <Tooltip permanent direction="center" className="cluster-label">
          {points.length}
        </Tooltip>
      </CircleMarker>
    )
  }

  // Zoom medio: sub-clusters por cuadrante (4 cuadrantes)
  if (zoom < 9) {
    const { south, north, west, east } = zone.bounds
    const midLat = (south + north) / 2
    const midLon = (west + east) / 2

    const quadrants = [
      { label: 'NW', bounds: { south: midLat, north, west, east: midLon }, pts: [] },
      { label: 'NE', bounds: { south: midLat, north, west: midLon, east }, pts: [] },
      { label: 'SW', bounds: { south, north: midLat, west, east: midLon }, pts: [] },
      { label: 'SE', bounds: { south, north: midLat, west: midLon, east }, pts: [] },
    ]
    points.forEach(p => {
      const N = p.lat >= midLat
      const E = p.lon >= midLon
      if (N && !E) quadrants[0].pts.push(p)
      else if (N && E) quadrants[1].pts.push(p)
      else if (!N && !E) quadrants[2].pts.push(p)
      else quadrants[3].pts.push(p)
    })

    return quadrants.filter(q => q.pts.length > 0).map(q => {
      const clat = (q.bounds.south + q.bounds.north) / 2
      const clon = (q.bounds.west + q.bounds.east) / 2
      const avgVel = q.pts.reduce((s, p) => s + p.velocity, 0) / q.pts.length
      const col = avgVel < -8 ? '#e53e3e' : avgVel < -3 ? '#ed8936' : '#38a169'
      return (
        <CircleMarker
          key={q.label}
          center={[clat, clon]}
          radius={15}
          pathOptions={{ color: col, fillColor: col, fillOpacity: 0.80, weight: 2 }}
        >
          <Tooltip permanent direction="center" className="cluster-label">
            {q.pts.length}
          </Tooltip>
        </CircleMarker>
      )
    })
  }

  // Zoom alto: puntos individuales
  return points.map(p => {
    const col = p.velocity < -8 ? '#e53e3e'
              : p.velocity < -3 ? '#ed8936'
              : p.velocity < 0  ? '#fbbf24'
              : p.velocity < 3  ? '#86efac'
              : '#3b82f6'
    const isSelected = selectedPointId === p.id
    return (
      <CircleMarker
        key={p.id}
        center={[p.lat, p.lon]}
        radius={isSelected ? 9 : 6}
        pathOptions={{
          color: isSelected ? '#1a365d' : '#fff',
          weight: isSelected ? 2 : 1,
          fillColor: col,
          fillOpacity: 0.9,
        }}
        eventHandlers={{ click: (e) => { e.originalEvent?.stopPropagation(); onPointClick(p, zone) } }}
      >
        <Tooltip>
          <div style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
            {p.lat.toFixed(4)}°, {p.lon.toFixed(4)}°<br />
            vel: {p.velocity.toFixed(2)} mm/a<br />
            coh: {(p.coherence * 100).toFixed(0)}%
          </div>
        </Tooltip>
      </CircleMarker>
    )
  })
}

/* ── Mapa interior (necesita estar dentro de MapContainer) ──────── */
function MapInner({
  selectedZone, onSelectZone, controls,
  onPointClick, selectedPoint, selectedPointZone,
}) {
  const zoom = useZoom()
  const { mapType = 'osm', layers = {} } = controls

  // Overlay por zona (solo la activa si hay producto seleccionado)
  const viewMode = layers.interferogram ? 'interferogram' : 'velocity'

  return (
    <>
      <TileLayer key={mapType} {...TILE_LAYERS[mapType]} />

      {/* Overlays InSAR de todas las zonas procesadas */}
      {PROCESSED_ZONES.filter(z => z.processed).map(zone => (
        <ZoneOverlay key={zone.id} zone={zone} viewMode={viewMode}
          layers={layers} zoom={zoom} />
      ))}

      {/* Rectángulos de zonas + markers */}
      {PROCESSED_ZONES.map(zone => {
        const b = zone.bounds
        const isSel = selectedZone?.id === zone.id
        return (
          <React.Fragment key={zone.id}>
            <Rectangle
              bounds={[[b.south, b.west], [b.north, b.east]]}
              pathOptions={{
                color: zone.processed
                  ? (isSel ? '#1a365d' : '#3b82f6')
                  : '#9ca3af',
                weight: isSel ? 3 : 1.5,
                fill: false,          // Sin fill → solo borde intercepta clics
                dashArray: zone.processed ? null : '6 3',
              }}
              eventHandlers={{ click: () => onSelectZone(zone) }}
            />
            {zone.processed && (
              <ZoneMarkers
                zone={zone}
                zoom={zoom}
                onPointClick={onPointClick}
                selectedPointId={selectedPoint?.id}
              />
            )}
          </React.Fragment>
        )
      })}

      {selectedZone && <FlyTo region={selectedZone} />}
    </>
  )
}

/* ── Overlay por zona ───────────────────────────────────────────── */
function ZoneOverlay({ zone, viewMode, layers, zoom }) {
  const img = useOverlayImage(zone, viewMode)
  if (!img) return null
  if (!layers.velocity && !layers.interferogram && !layers.coherence && !layers.psVelocity) return null
  const b = zone.bounds
  return (
    <ImageOverlay
      url={img}
      bounds={[[b.south, b.west], [b.north, b.east]]}
      opacity={zoom < 7 ? 0.65 : 0.78}
      zIndex={400}
    />
  )
}

/* ── Leyenda flotante ───────────────────────────────────────────── */
function MapLegend({ viewMode }) {
  const gradient = viewMode === 'interferogram'
    ? 'linear-gradient(90deg,hsl(0,75%,50%),hsl(60,75%,50%),hsl(120,75%,50%),hsl(180,75%,50%),hsl(240,75%,50%),hsl(300,75%,50%))'
    : 'linear-gradient(90deg,#7b0d0d,#d74545,#f5a672,#f5f5f5,#8cc8f0,#3a7bd5,#091a40)'
  return (
    <div className="map-legend">
      <div className="map-legend-title">Vel. LOS media [mm/año]</div>
      <div className="map-legend-bar" style={{ background: gradient }} />
      <div className="map-legend-labels">
        <span>-25</span><span>0</span><span>+25</span>
      </div>
    </div>
  )
}

/* ── Componente exportado ───────────────────────────────────────── */
export default function InSARMap({ selectedZone, onSelectZone, controls }) {
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [selectedPointZone, setSelectedPointZone] = useState(null)

  const handlePointClick = useCallback((point, zone) => {
    setSelectedPoint(point)
    setSelectedPointZone(zone)
  }, [])

  const handleClosePopup = useCallback(() => {
    setSelectedPoint(null)
    setSelectedPointZone(null)
  }, [])

  const viewMode = controls?.layers?.interferogram ? 'interferogram' : 'velocity'
  const showLegend = controls?.layers?.velocity || controls?.layers?.interferogram || true

  return (
    <div className="insar-map-wrapper">
      <MapContainer
        center={[-36, -66]}
        zoom={5}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <MapInner
          selectedZone={selectedZone}
          onSelectZone={onSelectZone}
          controls={controls}
          onPointClick={handlePointClick}
          selectedPoint={selectedPoint}
          selectedPointZone={selectedPointZone}
        />
      </MapContainer>

      {/* Leyenda */}
      {showLegend && <MapLegend viewMode={viewMode} />}

      {/* Popup de serie temporal (overlay HTML fuera del canvas Leaflet) */}
      {selectedPoint && (
        <div className="ts-popup-overlay">
          <TimeSeriesPopup
            point={selectedPoint}
            zone={selectedPointZone}
            options={{
              showRegression: controls?.showLinear,
              showTheilSen: controls?.showTheilSen,
              showHistogram: controls?.showHistogram,
            }}
            onClose={handleClosePopup}
          />
        </div>
      )}

      {/* Hint inicial */}
      {!selectedZone && (
        <div className="map-hint">
          🖱️ Clic en una zona procesada (azul) · Use el panel izquierdo
        </div>
      )}
    </div>
  )
}
