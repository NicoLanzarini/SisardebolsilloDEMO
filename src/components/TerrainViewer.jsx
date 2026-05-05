import React, { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Grid } from '@react-three/drei'
import * as THREE from 'three'
import {
  generateTerrain,
  generateInSAR,
  velocityColor,
  interferogramColor,
} from '../utils/terrain'

const GRID_W = 128
const GRID_H = 128

/* ── TerrainMesh: malla 3D con color InSAR ────────────────────── */
function TerrainMesh({ region, viewMode, exaggeration }) {
  const meshRef = useRef()
  const { bounds, seed } = region

  const { geometry } = useMemo(() => {
    const terrain = generateTerrain(GRID_W, GRID_H, bounds, seed)
    const insar = generateInSAR(GRID_W, GRID_H, bounds, seed)

    // Normalizar terreno
    let tMin = Infinity, tMax = -Infinity
    for (let i = 0; i < terrain.length; i++) {
      if (terrain[i] < tMin) tMin = terrain[i]
      if (terrain[i] > tMax) tMax = terrain[i]
    }
    const tRange = tMax - tMin || 1

    const positions = new Float32Array(GRID_W * GRID_H * 3)
    const colors = new Float32Array(GRID_W * GRID_H * 3)

    const colorFn = viewMode === 'velocity' ? velocityColor : interferogramColor

    for (let j = 0; j < GRID_H; j++) {
      for (let i = 0; i < GRID_W; i++) {
        const idx = j * GRID_W + i
        const u = i / (GRID_W - 1)
        const v = j / (GRID_H - 1)

        // Position: X = lon, Z = lat, Y = elevation
        positions[idx * 3] = (u - 0.5) * 10
        positions[idx * 3 + 1] = ((terrain[idx] - tMin) / tRange) * exaggeration
        positions[idx * 3 + 2] = (v - 0.5) * 10

        // Color from InSAR
        const val = insar[idx]
        const [r, g, b] = colorFn(val)
        colors[idx * 3] = r
        colors[idx * 3 + 1] = g
        colors[idx * 3 + 2] = b
      }
    }

    // Indices
    const indices = []
    for (let j = 0; j < GRID_H - 1; j++) {
      for (let i = 0; i < GRID_W - 1; i++) {
        const a = j * GRID_W + i
        const b = j * GRID_W + i + 1
        const c = (j + 1) * GRID_W + i
        const d = (j + 1) * GRID_W + i + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setIndex(indices)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    return { geometry: geo }
  }, [bounds, seed, viewMode, exaggeration])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.85}
        metalness={0.05}
        flatShading={false}
      />
    </mesh>
  )
}

/* ── Ejes con etiquetas ───────────────────────────────────────── */
function AxisLabels({ region }) {
  const { bounds } = region
  return (
    <group>
      {/* Label Longitud (X axis) */}
      <Text
        position={[0, -0.3, 5.8]}
        fontSize={0.28}
        color="#4b5563"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf"
      >
        Longitud ({bounds.west.toFixed(1)} a {bounds.east.toFixed(1)})
      </Text>
      {/* Label Latitud (Z axis) */}
      <Text
        position={[-5.8, -0.3, 0]}
        fontSize={0.28}
        color="#4b5563"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf"
      >
        Latitud ({bounds.south.toFixed(1)} a {bounds.north.toFixed(1)})
      </Text>
      {/* Elevation label */}
      <Text
        position={[-5.8, 1, -5.5]}
        fontSize={0.24}
        color="#9ca3af"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 4, Math.PI / 2]}
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf"
      >
        Elevacion (m)
      </Text>
    </group>
  )
}

/* ── Bounding box wireframe ───────────────────────────────────── */
function BoundingBox() {
  const points = useMemo(() => {
    const s = 5
    return new THREE.BufferGeometry().setFromPoints([
      // Bottom square
      new THREE.Vector3(-s, 0, -s),
      new THREE.Vector3(s, 0, -s),
      new THREE.Vector3(s, 0, s),
      new THREE.Vector3(-s, 0, s),
      new THREE.Vector3(-s, 0, -s),
    ])
  }, [])

  return (
    <line geometry={points}>
      <lineBasicMaterial color="#d1d5db" linewidth={1} />
    </line>
  )
}

/* ── Scene principal ──────────────────────────────────────────── */
function Scene({ region, viewMode, exaggeration }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={0.9}
        color="#ffffff"
        castShadow={false}
      />
      <directionalLight
        position={[-4, 6, -3]}
        intensity={0.25}
        color="#b0c4de"
      />

      {/* Terrain */}
      <TerrainMesh
        region={region}
        viewMode={viewMode}
        exaggeration={exaggeration}
      />

      {/* Floor grid */}
      <Grid
        args={[20, 20]}
        position={[0, -0.02, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#d1d5db"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={25}
        infiniteGrid={false}
      />

      <BoundingBox />
      <AxisLabels region={region} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={25}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.5, 0]}
      />
    </>
  )
}

/* ── Componente exportado ─────────────────────────────────────── */
export default function TerrainViewer({ region, viewMode, exaggeration, isReady }) {
  if (!region || !isReady) {
    return (
      <div className="viewer-empty">
        <div className="empty-icon">🏔️</div>
        <p>
          {!region
            ? 'Seleccione una zona en el mapa para visualizar'
            : 'Presione "Analizar" para generar la visualizacion 3D'}
        </p>
        <span className="hint">
          El terreno se generara con datos InSAR sinteticos sobre DEM
        </span>
      </div>
    )
  }

  return (
    <Canvas
      camera={{
        position: [8, 6, 8],
        fov: 45,
        near: 0.1,
        far: 100,
      }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: 'linear-gradient(180deg, #eef2f7 0%, #dce3ed 100%)' }}
      id="terrain-canvas"
    >
      <color attach="background" args={['#eef2f7']} />
      <fog attach="fog" args={['#eef2f7', 20, 40]} />
      <Scene
        region={region}
        viewMode={viewMode}
        exaggeration={exaggeration}
      />
    </Canvas>
  )
}
