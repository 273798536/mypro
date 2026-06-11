import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './store'
import { validateStores } from './store'

const validation = validateStores();
if (!validation.ok) {
  console.error(
    '[StoreRegistry] FATAL: Required stores are missing.\n' +
    `Missing: [${validation.missing.join(', ')}]\n` +
    `Registered: [${validation.registered.join(', ')}]\n` +
    'Check that all store files are imported in src/store/index.ts in the correct order.'
  );
} else {
  console.log(
    `[StoreRegistry] All stores registered successfully: [${validation.registered.join(', ')}]`
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
