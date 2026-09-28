// 앱 설치(PWA)용 서비스 워커 — 인터넷이 없어도 앱 화면이 열리도록 캐시
// 화면(index.html)은 항상 새 버전을 먼저 받아 오고, 실패할 때만 캐시를 쓴다
const CACHE = 'kotoba-v1'
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest', './icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

const put = (req, res) => {
  if (res.ok || res.type === 'opaque') caches.open(CACHE).then(c => c.put(req, res))
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameApp = url.origin === location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname)

  // 화면: 네트워크 먼저 → 실패하면 캐시
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => put('./', res.clone()) && res).catch(() => caches.match('./')))
    return
  }
  // 빌드 파일(이름에 해시가 붙어 바뀌지 않음)·글꼴: 캐시 먼저
  if ((sameApp && url.pathname.includes('/assets/')) || FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res.clone()) && res)))
    return
  }
  // 아이콘 등 나머지 앱 파일: 캐시로 바로 보여 주고 뒤에서 새로 받아 두기
  if (sameApp) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => put(req, res.clone()) && res).catch(() => hit)
      return hit || net
    }))
  }
  // 로그인·진행 상황 저장(Supabase)은 건드리지 않음
})
