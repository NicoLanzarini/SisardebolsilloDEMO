import React from 'react'

const features = [
  {
    icon: '🛰️',
    title: 'Sentinel-1 SLC',
    desc: 'Descarga automatizada de imagenes radar SAR desde Alaska Satellite Facility (NASA Earthdata).',
  },
  {
    icon: '🏔️',
    title: 'ISCE2 + MintPy',
    desc: 'Procesamiento interferometrico con ISCE2 topsStack y series temporales SBAS con MintPy.',
  },
  {
    icon: '📊',
    title: 'Visualizacion 3D',
    desc: 'Mapas de deformacion sobre terreno real con gradientes de velocidad en mm/anio.',
  },
  {
    icon: '🔬',
    title: 'Correccion DEM',
    desc: 'Algoritmo Euillades (2004) para correccion de Modelos Digitales de Elevacion por puntos GPS.',
  },
]

export default function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-bg-pattern" />

      {/* Top bar */}
      <div className="landing-topbar">
        <div className="landing-topbar-logo">
          <span className="icon">🛰️</span>
          <span>SISAR</span>
        </div>
        <div className="landing-topbar-links">
          <a href="https://www.uncuyo.edu.ar" target="_blank" rel="noreferrer">UNCuyo</a>
          <a href="https://cediac.ingenieria.uncuyo.edu.ar" target="_blank" rel="noreferrer">CEDIAC</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Documentacion</a>
        </div>
      </div>

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-hero-inner anim-fadein-up" style={{ animationDelay: '0.05s' }}>
          <div className="landing-badge">
            CEDIAC · CONICET · Universidad Nacional de Cuyo
          </div>

          <h1>
            Sistema de Analisis<br />
            <span className="gold">InSAR</span> Satelital
          </h1>

          <h2>
            Plataforma de monitoreo de deformacion superficial mediante
            interferometria diferencial de radar de apertura sintetica (D-InSAR).
            Procesamiento automatizado, visualizacion 3D y analisis de series temporales.
          </h2>

          <button
            className="landing-enter-btn"
            onClick={onEnter}
          >
            Entrar al Sistema
            <span className="arrow">→</span>
          </button>

          {/* Features grid */}
          <div className="landing-features">
            {features.map((feat, i) => (
              <div
                key={feat.title}
                className="landing-feature anim-fadein-up"
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
              >
                <div className="feat-icon">{feat.icon}</div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        Universidad Nacional de Cuyo · CEDIAC · CONICET — Mendoza, Argentina
        &nbsp;|&nbsp;
        Basado en la tesis doctoral de <strong>Pablo A. Euillades (2004)</strong>
        &nbsp;|&nbsp;
        <a href="https://search.asf.alaska.edu" target="_blank" rel="noreferrer">
          Alaska Satellite Facility
        </a>
      </div>
    </div>
  )
}
