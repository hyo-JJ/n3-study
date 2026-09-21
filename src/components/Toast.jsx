import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2300)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.msg}</div>
      ))}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
