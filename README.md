# SISAR — Sistema InSAR Satelital · Demo Frontend

Demo interactivo del Sistema de Análisis InSAR (SISAR) desarrollado en
**CEDIAC, Universidad Nacional de Cuyo**. Visualización 3D de productos
ISCE2 / MintPy / MiaplPy con datos sintéticos.

> Este repo contiene únicamente el frontend (React + Vite). El pipeline real
> ISCE2 + MintPy corre en Docker bajo el proyecto SISAR principal.

---

## Desarrollo local

Requisitos: **Node.js 18+**

```bash
npm install
npm run dev          # corre en http://localhost:3000
```

En Windows también funciona el doble clic en `INICIAR.bat`.

## Build de producción

```bash
npm run build        # output en /dist
npm run preview      # sirve /dist localmente para verificar
```

---

## Deployment

El proyecto está pre-configurado para tres plataformas gratuitas. Elegí una:

### 1. Vercel (recomendado · más simple)

1. Crear cuenta en [vercel.com](https://vercel.com) (login con GitHub)
2. Botón **"Add New Project"** → importar el repo de GitHub
3. Vercel detecta `vercel.json` y **deploya automáticamente**
4. URL pública en ~1 minuto: `https://sisar-demo-react.vercel.app`

Cada `git push` re-deploya automáticamente.

### 2. Netlify

1. Crear cuenta en [netlify.com](https://netlify.com) (login con GitHub)
2. **"Add new site"** → **"Import from Git"** → seleccionar repo
3. Detecta `netlify.toml` automáticamente. Click en **Deploy**
4. URL pública: `https://sisar-demo-react.netlify.app`

### 3. GitHub Pages (gratis, en el mismo GitHub)

1. Push del repo a GitHub (`main` branch)
2. En el repo: **Settings → Pages → Source → GitHub Actions**
3. El workflow `.github/workflows/deploy.yml` corre solo
4. URL pública: `https://<usuario>.github.io/sisar-demo-react/`

---

## Subir a GitHub paso a paso

```bash
# Inicializar repo
git init
git add .
git commit -m "Initial commit: SISAR demo frontend"

# Crear repo en github.com (sin README ni .gitignore)
# Después conectarlo:
git branch -M main
git remote add origin https://github.com/<tu-usuario>/sisar-demo-react.git
git push -u origin main
```

---

## Estructura del proyecto

```
sisar-demo-react/
├── src/
│   ├── App.jsx                    # Router (landing ↔ dashboard) con lazy loading
│   ├── main.jsx                   # Entry point React
│   ├── styles.css                 # Estilos globales (paleta CEDIAC)
│   ├── pages/
│   │   ├── LandingPage.jsx        # Hero + features + botón "Entrar"
│   │   └── Dashboard.jsx          # Dashboard principal (6 secciones)
│   ├── components/
│   │   ├── MapSelector.jsx        # Mapa 2D Leaflet — selección de zona
│   │   ├── TerrainViewer.jsx      # Visualización 3D Three.js
│   │   ├── ProcessTimeline.jsx    # Animación del pipeline
│   │   ├── AnalysisPanel.jsx      # KPIs + interpretación
│   │   ├── InSARProducts.jsx      # Gráficos MintPy/MiaplPy/ISCE2
│   │   └── DEMCorrection.jsx      # Nota compacta corrección DEM
│   └── utils/
│       └── terrain.js             # Generadores sintéticos de terreno + InSAR
├── public/                        # Assets estáticos (logos, etc.)
├── vercel.json                    # Config Vercel
├── netlify.toml                   # Config Netlify
└── .github/workflows/deploy.yml   # Config GitHub Pages
```

## Optimizaciones aplicadas

- **Code splitting**: bundles separados (react / three / leaflet / motion)
- **Lazy loading**: el Dashboard solo carga cuando el usuario entra
- **Cache headers**: assets versionados con cache de 1 año
- **Splash screen**: feedback visual mientras carga el bundle JS
- **SEO meta tags**: Open Graph para compartir en redes

---

## Próximos pasos para producción real

- [ ] Conectar a backend Python (FastAPI) que ejecute ISCE2 + MintPy
- [ ] WebSockets para progreso del pipeline en tiempo real
- [ ] Autenticación de usuarios (los reportes ya soportan campo `usuario`)
- [ ] Persistencia de análisis previos (DB)
- [ ] Bot Telegram conectado (@SISAR_CEDIAC_bot)
- [ ] Datos reales Sentinel-1 desde Alaska Satellite Facility

---

## Stack técnico

| Categoría | Tecnología |
|-----------|------------|
| Framework | React 18 + Vite 5 |
| 3D | Three.js + @react-three/fiber + drei |
| 2D Maps | Leaflet + react-leaflet |
| Animations | Framer Motion |
| Pipeline real (futuro) | ISCE2 + MintPy + MiaplPy en Docker |
| Datos | Sentinel-1 SLC (ESA/Copernicus) vía ASF |
| DEM | Copernicus GLO-30 (corrección Euillades 2004) |

---

**SISAR** · Universidad Nacional de Cuyo · CEDIAC · CONICET — Mendoza, Argentina
