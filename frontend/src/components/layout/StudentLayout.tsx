import {
  LayoutDashboard,
  CalendarDays,
  UserCircle,
  Ticket,
  ClipboardCheck,
  BookOpen,
  Settings,
} from 'lucide-react';
import { DashboardShell } from './DashboardShell';
import { useAuth } from '../../context/AuthContext';

export function StudentLayout() {
  const { student, logoutStudent } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
    { label: 'My Profile', to: '/dashboard/profile', icon: UserCircle },
    { label: 'My Events', to: '/dashboard/events', icon: Ticket },
    { label: 'My Attendance', to: '/dashboard/attendance', icon: ClipboardCheck },
    { label: 'Available Events', to: '/events', icon: CalendarDays },
    { label: 'Resources', to: '/dashboard/resources', icon: BookOpen },
    { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      userLabel={student?.name || 'Student'}
      userSubLabel={student?.department || 'GDGoC GCEE'}
      logout={logoutStudent}
      basePath="/dashboard"
    />
  );
}
