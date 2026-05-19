import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/variables.css'
import './styles/global.css'
import App from './App.tsx'
import { applyTheme } from './utils/themeEngine'
import { PRESET_THEMES } from './utils/themeEngine'

// Apply saved theme before first render to avoid a flash of the default colours.
// We duplicate the minimal load logic here rather than importing useTheme (which
// is a hook and can only run inside React).
try {
  const raw = localStorage.getItem('seneschal_theme')
  if (raw) {
    const saved = JSON.parse(raw)
    if (saved?.tokens) applyTheme(saved.tokens)
    else applyTheme(PRESET_THEMES[0].tokens)
  } else {
    applyTheme(PRESET_THEMES[0].tokens)
  }
} catch {
  applyTheme(PRESET_THEMES[0].tokens)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
