import React from 'react'

const STEPS = [
  {
    label: 'Descarga SLC',
    desc: 'Sentinel-1 IW SLC desde ASF Earthdata',
    icon: '📡',
  },
  {
    label: 'Orbitas + DEM',
    desc: 'EOF (ESA) + Copernicus GLO-30',
    icon: '🌍',
  },
  {
    label: 'ISCE2 topsStack',
    desc: 'stackSentinel.py 16 runs paralelos',
    icon: '⚙️',
  },
  {
    label: 'Interferogramas',
    desc: 'Fase diferencial, filtrado, unwrapping',
    icon: '🌊',
  },
  {
    label: 'MintPy SBAS',
    desc: 'Series temporales + correccion troposferica',
    icon: '📈',
  },
  {
    label: 'Productos',
    desc: 'Velocidad, coherencia, serie temporal',
    icon: '✅',
  },
]

export default function ProcessTimeline({ currentStep }) {
  return (
    <div className="process-steps">
      {STEPS.map((step, i) => {
        const stepNum = i + 1
        let state = 'pending'
        if (stepNum < currentStep) state = 'completed'
        else if (stepNum === currentStep) state = 'active'

        return (
          <div
            key={step.label}
            className={`process-step ${state}`}
          >
            <div className="step-dot" title={step.label}>
              {state === 'completed' && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                }}>
                  ✓
                </span>
              )}
              {state === 'active' && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#fff',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
              )}
            </div>
            <div className="step-label">{step.icon} {step.label}</div>
            <div className="step-desc">{step.desc}</div>
          </div>
        )
      })}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.5); }
        }
      `}</style>
    </div>
  )
}
