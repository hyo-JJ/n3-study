import { useEffect, useState } from 'react'

// 안드로이드·PC 크롬의 설치 창은 페이지가 뜨자마자 한 번만 오므로 미리 잡아 둔다
let deferred = null
const subs = new Set()
export function listenInstall() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach(f => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach(f => f()) })
}

const DISMISS_KEY = 'install-banner-hidden'
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// mode: 'prompt'(설치 버튼) | 'ios'(홈 화면에 추가 안내) | null(이미 설치됐거나 숨김)
export function useInstall() {
  const [, bump] = useState(0)
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem(DISMISS_KEY) } catch { return false } })
  useEffect(() => { const f = () => bump(n => n + 1); subs.add(f); return () => subs.delete(f) }, [])

  const mode = hidden || isStandalone() ? null : deferred ? 'prompt' : isIOS() ? 'ios' : null
  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    deferred = null
    bump(n => n + 1)
  }
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, '1') } catch {} setHidden(true) }
  return { mode, install, dismiss }
}
