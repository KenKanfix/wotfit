import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureSeed } from './db'

async function bootstrap() {
  await ensureSeed()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap().catch((error: unknown) => {
  console.error(error)
  const root = document.getElementById('root')
  if (root) {
    root.textContent = `Failed to start WOTFit: ${String(error)}`
  }
})
