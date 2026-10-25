import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthModal, ToastHost, UpgradeModal } from './components/Common'
import StaticHostNotice from './components/StaticHostNotice'
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
  '/': 'WeSolve — AI Study Tools built for students',
  '/pricing': 'Pricing — WeSolve',
  '/home': 'AI Solver — WeSolve',
  '/tutor': 'Whiteboard Tutor — WeSolve',
  '/flashcards': 'Flashcards — WeSolve',
  '/quiz': 'Quiz — WeSolve',
  '/study-guide': 'Study Guide — WeSolve',
  '/research': 'AI Research — WeSolve',
  '/exam': 'Exam Predictor — WeSolve',
  '/notes': 'AI Live Notes — WeSolve',
  '/history': 'History — WeSolve',
  '/library': 'Library — WeSolve',
  '/account': 'Account — WeSolve',
  '/mobile': 'Get the app — WeSolve',
  '/extension': 'Chrome Extension — WeSolve',
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = PAGE_TITLES[pathname] || 'Page not found — WeSolve'
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
      <StaticHostNotice />
      <ToastHost />
    </>
  )
}

// A project site is served from a subpath (e.g. /PASHco/), so the router has to
// strip that prefix or every route resolves to "not found".
const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
