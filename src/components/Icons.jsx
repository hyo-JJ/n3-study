// 선 아이콘 (lucide 스타일, 24x24)
const I = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
)

export const Moon = () => <I><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></I>
export const Sun = () => <I><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>
export const User = () => <I><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>
export const Back = () => <I><path d="M15 18l-6-6 6-6" /></I>
export const Play = () => <I><path d="M7 4v16l13-8z" fill="currentColor" /></I>
export const Plus = () => <I strokeWidth="3"><path d="M12 5v14M5 12h14" /></I>
export const Search = () => <I><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></I>
export const Star = () => <I><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></I>

// 파스텔 그림 아이콘 (public/icons/*.png) — 다크 모드에서는 CSS로 회색 처리
export const Pic = ({ name, size, className = '' }) => (
  <img className={`pic ${className}`} src={`${import.meta.env.BASE_URL}icons/${name}.png`} alt="" aria-hidden="true" draggable="false" style={size ? { width: size, height: size } : undefined} />
)
