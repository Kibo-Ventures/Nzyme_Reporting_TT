import { Routes, Route, Navigate } from 'react-router-dom'
import { FilterProvider } from './hooks/useFilters'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import TeamAccessGate from './components/TeamAccessGate'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import TimeTracker from './pages/TimeTracker'
import TeamAnalytics from './pages/TeamAnalytics'
import BoardPipeline from './pages/BoardPipeline'
import ProprietaryDealflow from './pages/ProprietaryDealflow'
import ChannelPerformance from './pages/ChannelPerformance'
import AdviserCoverage from './pages/AdviserCoverage'
import FunnelAnalysis from './pages/FunnelAnalysis'
import DynamicAnalysis from './pages/DynamicAnalysis'
import FundraisingActivity from './pages/FundraisingActivity'

export default function App() {
  return (
    <Routes>
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<FilterProvider><AppShell /></FilterProvider>}>
          <Route index                element={<Navigate to="/timetracker" replace />} />
          <Route path="/timetracker"  element={<TimeTracker />} />
          <Route path="/team"         element={<TeamAccessGate><TeamAnalytics /></TeamAccessGate>} />
          <Route path="/pipeline"     element={<BoardPipeline />} />
          <Route path="/proprietary"  element={<ProprietaryDealflow />} />
          <Route path="/channels"     element={<ChannelPerformance />} />
          <Route path="/advisers"     element={<AdviserCoverage />} />
          <Route path="/funnel"       element={<FunnelAnalysis />} />
          <Route path="/analysis"     element={<DynamicAnalysis />} />
          <Route path="/fundraising"  element={<TeamAccessGate><FundraisingActivity /></TeamAccessGate>} />
          <Route path="*"             element={<Navigate to="/timetracker" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
