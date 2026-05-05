import React from 'react'
import { motion } from 'framer-motion'

/**
 * Nota compacta sobre Correccion de MDE — Euillades (2004)
 * Reducido a mencion breve; el protagonismo va a MintPy/MiaplPy.
 */
export default function DEMCorrection() {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 18px',
        background: 'var(--gray-50)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-sm)',
      }}>
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📐</span>
        <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--blue-900)' }}>Correccion de MDE aplicada</strong>{' '}
          — Algoritmo Euillades (2004), Tesis Doctoral CEDIAC-UNCuyo.
          Se aplica correccion en 4 pasos (offset Z, plano MCO, TIN Delaunay, Laplace SOR)
          al DEM de referencia antes de la interpretacion de deformacion.
          <span style={{ display: 'block', marginTop: 6, fontSize: '0.76rem', color: 'var(--gray-500)' }}>
            Modulo: <code style={{ background: 'var(--gray-200)', padding: '1px 4px', borderRadius: 3 }}>dem_correction/euillades_correction.py</code>
          </span>
        </div>
      </div>
    </motion.div>
  )
}
