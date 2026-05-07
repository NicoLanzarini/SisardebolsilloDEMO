import React from 'react'

/* ── Panel de controles colapsible (derecha) ───────────────────── */
export default function ControlsPanel({ open, onToggle, controls, onChange }) {
  const {
    mapType = 'osm',
    scale = 2,
    wrap = 0,
    plotMin = -20,
    plotMax = 11,
    layers = { velocity: true, coherence: false, interferogram: false, psVelocity: false },
    geojson = { areas: true, convencionales: true, shale: true, tight: true },
    showHistogram = false,
    showLinear = true,
    showTheilSen = false,
  } = controls

  const set = (key, val) => onChange({ ...controls, [key]: val })
  const setLayer = (k, v) => onChange({ ...controls, layers: { ...layers, [k]: v } })
  const setGeo   = (k, v) => onChange({ ...controls, geojson: { ...geojson, [k]: v } })

  return (
    <div className={`controls-panel ${open ? 'open' : ''}`}>
      {/* Toggle handle */}
      <button className="controls-toggle" onClick={onToggle} title="Controles">
        {open ? '▶' : '◀'}
      </button>

      {open && (
        <div className="controls-body">
          {/* ── Tipo de mapa ── */}
          <div className="ctrl-section">
            <div className="ctrl-title">🗺️ Capa base</div>
            {[
              { id: 'osm',       label: 'OpenStreetMap' },
              { id: 'satellite', label: 'Satélite'      },
              { id: 'topo',      label: 'Topográfico'   },
            ].map(opt => (
              <label key={opt.id} className="ctrl-radio">
                <input type="radio" name="mapType" value={opt.id}
                  checked={mapType === opt.id}
                  onChange={() => set('mapType', opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>

          {/* ── Productos InSAR ── */}
          <div className="ctrl-section">
            <div className="ctrl-title">📊 Overlay InSAR</div>
            {[
              { id: 'velocity',      label: 'Velocidad LOS (MintPy)'    },
              { id: 'coherence',     label: 'Coherencia temporal'        },
              { id: 'interferogram', label: 'Interferograma (ISCE2)'     },
              { id: 'psVelocity',    label: 'Vel. PS (MiaplPy)'         },
            ].map(opt => (
              <label key={opt.id} className="ctrl-check">
                <input type="checkbox" checked={layers[opt.id] || false}
                  onChange={e => setLayer(opt.id, e.target.checked)} />
                {opt.label}
              </label>
            ))}
          </div>

          {/* ── Escala ── */}
          <div className="ctrl-section">
            <div className="ctrl-title">⚙️ Parámetros</div>
            <div className="ctrl-slider-row">
              <span>Scale</span>
              <input type="range" min="1" max="10" step="1" value={scale}
                onChange={e => set('scale', +e.target.value)} />
              <span className="ctrl-val">{scale}</span>
            </div>
            <div className="ctrl-slider-row">
              <span>Wrap</span>
              <input type="range" min="0" max="10" step="1" value={wrap}
                onChange={e => set('wrap', +e.target.value)} />
              <span className="ctrl-val">{wrap}</span>
            </div>
          </div>

          {/* ── Plot scale ── */}
          <div className="ctrl-section">
            <div className="ctrl-title">📏 Rango de plot (mm/año)</div>
            <div className="ctrl-slider-row">
              <span>Mín</span>
              <input type="range" min="-150" max="0" step="5" value={plotMin}
                onChange={e => set('plotMin', +e.target.value)} />
              <span className="ctrl-val">{plotMin}</span>
            </div>
            <div className="ctrl-slider-row">
              <span>Máx</span>
              <input type="range" min="0" max="150" step="5" value={plotMax}
                onChange={e => set('plotMax', +e.target.value)} />
              <span className="ctrl-val">{plotMax}</span>
            </div>
          </div>

          {/* ── Capas GeoJSON ── */}
          <div className="ctrl-section">
            <div className="ctrl-title">📄 Capas GeoJSON</div>
            {[
              { id: 'areas',          label: 'areas.geojson'             },
              { id: 'convencionales', label: 'convencionales_c_nqn'      },
              { id: 'shale',          label: 'shale_c_nqn.geojson'       },
              { id: 'tight',          label: 'tight_c_nqn.geojson'       },
            ].map(l => (
              <label key={l.id} className="ctrl-check">
                <input type="checkbox" checked={geojson[l.id] || false}
                  onChange={e => setGeo(l.id, e.target.checked)} />
                {l.label}
              </label>
            ))}
          </div>

          {/* ── Opciones estadísticas ── */}
          <div className="ctrl-section">
            <div className="ctrl-title">📈 Estadísticas</div>
            <label className="ctrl-check">
              <input type="checkbox" checked={showHistogram}
                onChange={e => set('showHistogram', e.target.checked)} />
              Add marginal histogram
            </label>
            <label className="ctrl-check">
              <input type="checkbox" checked={showLinear}
                onChange={e => set('showLinear', e.target.checked)} />
              Add linear regression
            </label>
            <label className="ctrl-check">
              <input type="checkbox" checked={showTheilSen}
                onChange={e => set('showTheilSen', e.target.checked)} />
              Add Theil-Sen regression
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
