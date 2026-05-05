import React from 'react'
import { motion } from 'framer-motion'

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
    <motion.div
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
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
          <a href="#" onClick={(e) => { e.preventDefault() }}>Documentacion</a>
        </div>
      </div>

      {/* Hero */}
      <div className="landing-hero">
        <motion.div
          className="landing-hero-inner"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
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

          <motion.button
            className="landing-enter-btn"
            onClick={onEnter}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Entrar al Sistema
            <span className="arrow">→</span>
          </motion.button>

          {/* Features grid */}
          <div className="landing-features">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                className="landing-feature"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
              >
                <div className="feat-icon">{feat.icon}</div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
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
    </motion.div>
  )
}
