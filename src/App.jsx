import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthModal, ToastHost, UpgradeModal } from './components/Common'
import ServiceSettingsModal from './components/ServiceSettingsModal'
import WorkspaceLayout from './components/WorkspaceLayout'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import SolverPage from './pages/SolverPage'
import FlashcardsPage from './pages/FlashcardsPage'
import QuizPage from './pages/QuizPage'
import StudyGuidePage from './pages/StudyGuidePage'
import TutorPage from './pages/TutorPage'
import ResearchPage from './pages/ResearchPage'
import ExamPage from './pages/ExamPage'
import NotesPage from './pages/NotesPage'
import { AccountPage, DownloadPage, HistoryPage, LibraryPage, NotFoundPage } from './pages/UtilityPages'

const PAGE_TITLES = {
  '/': 'Solvely — AI Study Tools built for students',
  '/pricing': 'Pricing — Solvely',
  '/home': 'AI Solver — Solvely',
  '/tutor': 'Whiteboard Tutor — Solvely',
  '/flashcards': 'Flashcards — Solvely',
  '/quiz': 'Quiz — Solvely',
  '/study-guide': 'Study Guide — Solvely',
  '/research': 'AI Research — Solvely',
  '/exam': 'Exam Predictor — Solvely',
  '/notes': 'AI Live Notes — Solvely',
  '/history': 'History — Solvely',
  '/library': 'Library — Solvely',
  '/account': 'Account — Solvely',
  '/mobile': 'Get the app — Solvely',
  '/extension': 'Chrome Extension — Solvely',
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = PAGE_TITLES[pathname] || 'Page not found — Solvely'
  }, [pathname])
  return null
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/mobile" element={<DownloadPage />} />
        <Route path="/extension" element={<DownloadPage />} />
        <Route element={<WorkspaceLayout />}>
          <Route path="/home" element={<SolverPage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/study-guide" element={<StudyGuidePage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AuthModal />
      <UpgradeModal />
      <ServiceSettingsModal />
      <ToastHost />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
