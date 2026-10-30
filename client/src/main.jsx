import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StoreApp from './StoreApp.jsx'

if (window.location.pathname === '/admin') window.history.replaceState({}, '', '/')
const App = StoreApp

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
