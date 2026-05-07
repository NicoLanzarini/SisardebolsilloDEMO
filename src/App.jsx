import React, { useState, Component } from 'react'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import MapDashboard from './pages/MapDashboard'

// ── ErrorBoundary: captura crashes de cualquier hijo y muestra fallback ──
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[SISAR ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh',
          background: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif', gap: 16,
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: '#1a365d', margin: 0 }}>Error en la aplicacion</h2>
          <p style={{ color: '#555e6b', fontSize: '0.9rem', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'Ocurrio un error inesperado.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }) }}
            style={{
              padding: '10px 24px', background: '#1a365d', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState('landing')
  const [selectedRegion, setSelectedRegion] = useState(null)

  return (
    <ErrorBoundary>
      <div className="app">
        <AnimatePresence mode="wait">
          {currentView === 'landing' ? (
            <LandingPage
              key="landing"
              onEnter={() => setCurrentView('dashboard')}
            />
          ) : (
            <MapDashboard
              key="dashboard"
              onBack={() => setCurrentView('landing')}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}
