import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/nb.css'
import App from './App.jsx'
import { listenInstall } from './lib/install'
import { watchUpdates } from './lib/update'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

listenInstall()
watchUpdates()
// 앱 설치·오프라인 실행용 (배포 빌드에서만)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    .then(reg => document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) }))
    .catch(() => {}))
}
