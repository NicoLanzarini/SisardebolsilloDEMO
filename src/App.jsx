import React, { useState, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'

// Lazy-load del Dashboard: Three.js + Leaflet solo se descargan cuando el
// usuario hace clic en "Entrar". La landing carga ~80KB en lugar de 1.4MB.
const Dashboard = lazy(() => import('./pages/Dashboard'))

function DashboardLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #e6ecf3 100%)',
      gap: 20,
    }}>
      <div style={{ fontSize: '3rem' }}>🛰️</div>
      <div style={{
        width: 240,
        height: 4,
        background: '#e2e8f0',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          height: '100%',
          width: '40%',
          background: 'linear-gradient(90deg, #1a365d, #c9a24a)',
          borderRadius: 2,
          animation: 'loaderSlide 1.2s infinite ease-in-out',
        }} />
      </div>
      <div style={{ color: '#1a365d', fontWeight: 600, fontSize: '0.9rem' }}>
        Cargando SISAR...
      </div>
      <div style={{ color: '#7a8494', fontSize: '0.78rem' }}>
        Inicializando motor 3D y mapas
      </div>
      <style>{`
        @keyframes loaderSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  )
}

export default function App() {
  const [currentView, setCurrentView] = useState('landing')
  const [selectedRegion, setSelectedRegion] = useState(null)

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
          <LandingPage
            key="landing"
            onEnter={() => setCurrentView('dashboard')}
          />
        ) : (
          <Suspense fallback={<DashboardLoader />}>
            <Dashboard
              key="dashboard"
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              onBack={() => setCurrentView('landing')}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  )
}
