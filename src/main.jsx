import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// StrictMode desactivado: causa doble montado en dev que rompe
// las animaciones de framer-motion (quedan en opacity: 0)
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
