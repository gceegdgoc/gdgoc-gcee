import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UsersRound,
  Award,
  Settings,
  ClipboardList,
  Image,
  Mail,
  BookOpen,
} from 'lucide-react';
import { DashboardShell } from './DashboardShell';
import { useAuth } from '../../context/AuthContext';

export function AdminLayout() {
  const { admin, logoutAdmin } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, end: true },
    { label: 'Students', to: '/admin/students', icon: Users },
    { label: 'Events', to: '/admin/events', icon: CalendarDays },
    { label: 'Event Registrations', to: '/admin/form-registrations', icon: ClipboardList },
    { label: 'Resources', to: '/admin/resources', icon: BookOpen },
    { label: 'Members', to: '/admin/members', icon: UsersRound },
    { label: 'Emails', to: '/admin/bulk-email', icon: Mail },
    { label: 'Certificates', to: '/admin/certificates', icon: Award },
    { label: 'Gallery', to: '/admin/gallery', icon: Image },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      userLabel={admin?.name || 'Admin'}
      userSubLabel="GDGoC GCEE Admin"
      logout={logoutAdmin}
      basePath="/admin"
    />
  );
}
