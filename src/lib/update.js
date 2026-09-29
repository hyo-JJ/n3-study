// 새 버전이 배포되면 자동으로 새로고침
// 앱으로 돌아올 때·몇 분마다 version.json을 확인하고, 학습·게임 도중이면 목록 화면으로 나올 때까지 기다린다
const URL = `${import.meta.env.BASE_URL}version.json`
const RELOADED = 'reloaded-for'
const idle = () => /^(#\/?(home|review|study\/\w+)?)?$/.test(location.hash)

let found = null
const reload = () => {
  if (!found || !idle()) return
  // 배포 직후 CDN이 아직 옛 화면을 줄 수 있어, 같은 버전 때문에 계속 새로고침되지 않게 한 번만
  try {
    if (sessionStorage.getItem(RELOADED) === found) return
    sessionStorage.setItem(RELOADED, found)
  } catch {}
  location.reload()
}

const check = async () => {
  try {
    const res = await fetch(`${URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { id } = await res.json()
    if (id && id !== __BUILD_ID__) { found = id; reload() }
  } catch {}
}

export function watchUpdates() {
  if (!import.meta.env.PROD) return
  check()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  window.addEventListener('hashchange', reload)
  setInterval(check, 5 * 60 * 1000)
}
