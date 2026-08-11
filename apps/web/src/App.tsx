import { Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './routes/LandingPage';
import { SignInPage } from './routes/SignInPage';
import { SignUpPage } from './routes/SignUpPage';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardPage } from './routes/DashboardPage';
import { TransactionsPage } from './routes/TransactionsPage';
import { AnalyticsPage } from './routes/AnalyticsPage';
import { IntelligencePage } from './routes/IntelligencePage';
import { CoachPage } from './routes/CoachPage';
import { GoalsPage } from './routes/GoalsPage';
import { NotFoundPage } from './routes/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="intelligence" element={<IntelligencePage />} />
        <Route path="coach" element={<CoachPage />} />
        <Route path="goals" element={<GoalsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}