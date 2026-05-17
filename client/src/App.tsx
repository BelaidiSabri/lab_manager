import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import RequirePasswordChanged from './components/RequirePasswordChanged';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminMembersPage from './pages/AdminMembersPage';
import RegisterPage from './pages/RegisterPage';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import ConcoursListPage from './pages/ConcoursListPage';
import ConcoursDetailPage from './pages/ConcoursDetailPage';
import ConcoursManagePage from './pages/ConcoursManagePage';
import PublicationsPage from './pages/PublicationsPage';
import PublicationNewPage from './pages/PublicationNewPage';
import PublicationDetailPage from './pages/PublicationDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectNewPage from './pages/ProjectNewPage';
import DocumentsPage from './pages/DocumentsPage';
import AdminGradesPage from './pages/AdminGradesPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import EncadreursPage from './pages/EncadreursPage';
import MyEncadrementRequestsPage from './pages/MyEncadrementRequestsPage';
import PublicLayout from './components/layout/PublicLayout';
import LandingPage from './pages/LandingPage';
import ContactPage from './pages/ContactPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route
                path="/login"
                element={
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
                    <LoginPage />
                  </div>
                }
              />
            </Route>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route
                path="/change-password"
                element={
                  <div className="flex min-h-svh flex-col items-center justify-center bg-page px-4 py-12">
                    <ChangePasswordPage />
                  </div>
                }
              />
              <Route element={<RequirePasswordChanged />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profil" element={<ProfilePage />} />
                  <Route path="/membres" element={<MembersPage />} />
                  <Route path="/membres/:id" element={<MemberDetailPage />} />
                  <Route path="/concours" element={<ConcoursListPage />} />
                  <Route path="/concours/:id" element={<ConcoursDetailPage />} />
                  <Route path="/concours/:id/manage" element={<ConcoursManagePage />} />
                  <Route path="/publications" element={<PublicationsPage />} />
                  <Route path="/publications/nouveau" element={<PublicationNewPage />} />
                  <Route path="/publications/:id" element={<PublicationDetailPage />} />
                  <Route path="/projets" element={<ProjectsPage />} />
                  <Route path="/projets/nouveau" element={<ProjectNewPage />} />
                  <Route path="/projets/:id" element={<ProjectDetailPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/equipes" element={<TeamsPage />} />
                  <Route path="/equipes/:id" element={<TeamDetailPage />} />
                  <Route path="/encadreurs" element={<EncadreursPage />} />
                  <Route path="/mes-demandes" element={<MyEncadrementRequestsPage />} />
                  <Route path="/admin/membres" element={<AdminMembersPage />} />
                  <Route path="/admin/grades" element={<AdminGradesPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
