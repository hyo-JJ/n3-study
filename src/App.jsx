import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProgressProvider } from './hooks/useProgress'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/Toast'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import FlashcardPage from './pages/FlashcardPage'
import BlankReviewPage from './pages/BlankReviewPage'
import QuizPage from './pages/QuizPage'
import WrongNotesPage from './pages/WrongNotesPage'
import WeekendPage from './pages/WeekendPage'

function AppRoutes() {
  const user = useAuth()

  if (user === undefined) {
    return (
      <div className="loader">
        <div className="spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    )
  }

  return (
    <ProgressProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/learn/:level/:day/flash" element={<FlashcardPage />} />
        <Route path="/learn/:level/:day/blank" element={<BlankReviewPage />} />
        <Route path="/quiz/:level/:day" element={<QuizPage />} />
        <Route path="/wrong" element={<WrongNotesPage />} />
        <Route path="/weekend" element={<WeekendPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </ProgressProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
