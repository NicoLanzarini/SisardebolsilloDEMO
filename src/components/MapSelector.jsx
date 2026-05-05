import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Rectangle, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { REGIONS } from '../utils/terrain'

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Component to fly to selected region
function FlyToRegion({ region }) {
  const map = useMap()
  useEffect(() => {
    if (region) {
      const b = region.bounds
      map.flyToBounds(
        [[b.south, b.west], [b.north, b.east]],
        { padding: [60, 60], duration: 1.2 }
      )
    }
  }, [region, map])
  return null
}

export default function MapSelector({ selectedRegion, onSelectRegion }) {
  const selectedObj = selectedRegion
    ? REGIONS.find(r => r.id === selectedRegion)
    : null

  // Center on Argentina / Southern cone
  const center = [-34, -66]
  const zoom = 5

  return (
    <div className="map-grid">
      <div className="map-container">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Regiones predefinidas como rectangulos */}
          {REGIONS.map(region => {
            const b = region.bounds
            const isSelected = selectedRegion === region.id
            return (
              <Rectangle
                key={region.id}
                bounds={[[b.south, b.west], [b.north, b.east]]}
                pathOptions={{
                  color: isSelected ? '#1a365d' : '#3182ce',
                  weight: isSelected ? 3 : 2,
                  fillColor: isSelected ? '#1a365d' : '#3182ce',
                  fillOpacity: isSelected ? 0.2 : 0.08,
                  dashArray: isSelected ? null : '6 4',
                }}
                eventHandlers={{
                  click: () => onSelectRegion(region.id),
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                    <strong style={{ fontSize: '0.9rem', color: '#1a365d' }}>
                      {region.name}
                    </strong>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {region.subtitle}
                    </span>
                    <p style={{ fontSize: '0.78rem', marginTop: 6, color: '#374151', lineHeight: 1.4 }}>
                      {region.description}
                    </p>
                  </div>
                </Popup>
              </Rectangle>
            )
          })}

          {/* Fly to selected region */}
          {selectedObj && <FlyToRegion region={selectedObj} />}
        </MapContainer>
      </div>

      {/* Region list */}
      <div className="region-list">
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>
          Zonas disponibles
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--gray-400)', marginBottom: 10 }}>
          Seleccione una zona para analizar o haga click en el mapa
        </div>
        {REGIONS.map(region => (
          <div
            key={region.id}
            className={`region-card ${selectedRegion === region.id ? 'selected' : ''}`}
            onClick={() => onSelectRegion(region.id)}
          >
            <h4>{region.name}</h4>
            <div className="region-sub">{region.subtitle}</div>
            <p>{region.description}</p>
            <div className="region-coords">
              {region.bounds.south.toFixed(2)}° — {region.bounds.north.toFixed(2)}°N &nbsp;·&nbsp;
              {region.bounds.west.toFixed(2)}° — {region.bounds.east.toFixed(2)}°E
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
