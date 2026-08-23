import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { AdminLayout } from './components/layout/AdminLayout';

import Home from './pages/public/Home';
import About from './pages/public/About';
import Events from './pages/public/Events';
import EventDetail from './pages/public/EventDetail';
import EventRegister from './pages/public/EventRegister';
import TeamMembers from './pages/public/TeamMembers';
import Gallery from './pages/public/Gallery';
import Resources from './pages/public/Resources';
import Contact from './pages/public/Contact';
import Certificates from './pages/public/Certificates';
import VerifyCertificate from './pages/public/VerifyCertificate';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import StudentDashboard from './pages/student/Dashboard';
import StudentProfile from './pages/student/Profile';
import StudentEvents from './pages/student/MyEvents';
import StudentAttendance from './pages/student/MyAttendance';
import StudentCertificates from './pages/student/MyCertificates';
import StudentResources from './pages/student/StudentResources';
import StudentSettings from './pages/student/Settings';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventCreate from './pages/admin/AdminEventCreate';
import AdminEventDetail from './pages/admin/AdminEventDetail';
import AdminStudents from './pages/admin/AdminStudents';
import AdminMembers from './pages/admin/AdminMembers';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminCampaigns from './pages/admin/AdminCampaigns';
import AdminCampaignDetail from './pages/admin/AdminCampaignDetail';
import AdminGallery from './pages/admin/AdminGallery';
import AdminResources from './pages/admin/AdminResources';
import AdminSettings from './pages/admin/AdminSettings';
import AdminFormRegistrations from './pages/admin/AdminFormRegistrations';
import AdminBulkEmail from './pages/admin/AdminBulkEmail';

function RequireStudent({ children }: { children: React.ReactNode }) {
  const { student, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!student) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-g-blue border-t-transparent" />
        <p className="text-sm text-ink-muted">Loading GDGoC GCEE…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:eventId" element={<EventDetail />} />
        <Route path="/events/:eventId/register" element={<EventRegister />} />
        <Route path="/team" element={<TeamMembers />} />
        <Route path="/team-members" element={<TeamMembers />} />
        <Route path="/join" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
        <Route path="/certificate/:certificateId" element={<VerifyCertificate />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Student dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireStudent>
            <StudentLayout />
          </RequireStudent>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="events" element={<StudentEvents />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="certificates" element={<StudentCertificates />} />
        <Route path="resources" element={<StudentResources />} />
        <Route path="settings" element={<StudentSettings />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/create" element={<AdminEventCreate />} />
        <Route path="events/:eventId" element={<AdminEventDetail />} />
        <Route path="events/:eventId/registrations" element={<AdminEventDetail />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="certificate-campaigns" element={<AdminCampaigns />} />
        <Route path="certificate-campaigns/:id" element={<AdminCampaignDetail />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="resources" element={<AdminResources />} />
        <Route path="form-registrations" element={<AdminFormRegistrations />} />
        <Route path="bulk-email" element={<AdminBulkEmail />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
