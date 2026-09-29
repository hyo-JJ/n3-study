import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 배포할 때마다 바뀌는 버전 — 앱이 version.json과 비교해 새 버전이면 자동 새로고침
const BUILD_ID = Date.now().toString(36)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-id',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  base: '/n3-study/',
})
