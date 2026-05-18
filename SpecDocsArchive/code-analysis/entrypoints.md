# Entry Points

## Files Covered
- `src/main.tsx`
- `src/test-setup.ts`

---

## main.tsx

### Purpose
The application entry point. Mounts the root `App` component into the DOM.

### Contents
Standard Vite + React boilerplate:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Notes
- `StrictMode` is enabled — this intentionally double-invokes effects in development to surface side-effect bugs.
- `index.css` is imported here (global baseline styles).
- No cleanup needed — this file is correct and minimal.

---

## test-setup.ts

### Purpose
Vitest test setup file. Currently contains a single import:
```ts
import '@testing-library/jest-dom';
```

This extends Vitest's `expect` with `@testing-library/jest-dom` matchers (e.g., `toBeInTheDocument()`, `toHaveClass()`, etc.).

### Notes
- This file is referenced in `vite.config.ts` (not analyzed) as the `setupFiles` entry for the test runner.
- The file is effectively a placeholder — no tests exist yet. It confirms that `@testing-library/jest-dom` is already installed and configured.
- No cleanup needed. When tests are written, any additional global setup (e.g., mock service worker setup, IndexedDB mocks for Dexie) would be added here.

---

## Cross-File Notes
- `index.css` is imported in `main.tsx` but also `App.module.css` and `App.css` exist in the same directory. The relationship between `index.css`, `App.css`, and `App.module.css` should be clarified:
  - `index.css` — global baseline (CSS reset, custom properties, body styles)
  - `App.module.css` — CSS module for the `App` component layout
  - `App.css` — unclear purpose; may be an artifact or a global override file. Worth reviewing in the CSS cleanup pass.
