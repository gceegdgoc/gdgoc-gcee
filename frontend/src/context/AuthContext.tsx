import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getErrorMessage } from '../lib/api';
import type { Admin, Student } from '../types';

interface RegisterResult {
  success: boolean;
  message: string;
  student: Student;
  requiresVerification?: boolean;
  emailDelivered?: boolean;
}

interface AuthContextValue {
  student: Student | null;
  admin: Admin | null;
  loading: boolean;
  loginStudent: (email: string, password: string) => Promise<Student>;
  registerStudent: (data: Record<string, string>) => Promise<RegisterResult>;
  logoutStudent: () => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<Admin>;
  logoutAdmin: () => Promise<void>;
  setStudent: (s: Student | null) => void;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const [studentRes, adminRes] = await Promise.all([
          api.get('/auth/me').catch(() => null),
          api.get('/admin/auth/me').catch(() => null),
        ]);
        if (!mounted) return;
        if (studentRes?.data?.student) setStudent(studentRes.data.student);
        if (adminRes?.data?.admin) setAdmin(adminRes.data.admin);
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  async function loginStudent(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setStudent(res.data.student);
    return res.data.student as Student;
  }

  async function registerStudent(data: Record<string, string>) {
    const res = await api.post('/auth/register', data);
    setStudent(res.data.student);
    return res.data;
  }

  async function logoutStudent() {
    await api.post('/auth/logout').catch(() => null);
    setStudent(null);
  }

  async function loginAdmin(email: string, password: string) {
    const res = await api.post('/admin/auth/login', { email, password });
    setAdmin(res.data.admin);
    return res.data.admin as Admin;
  }

  async function logoutAdmin() {
    await api.post('/admin/auth/logout').catch(() => null);
    setAdmin(null);
  }

  async function sendOtp(email: string) {
    const res = await api.post('/auth/send-otp', { email });
    return res.data;
  }

  async function verifyOtp(email: string, otp: string) {
    await api.post('/auth/verify-otp', { email, otp });
  }

  return (
    <AuthContext.Provider
      value={{
        student,
        admin,
        loading,
        loginStudent,
        registerStudent,
        logoutStudent,
        loginAdmin,
        logoutAdmin,
        setStudent,
        sendOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { getErrorMessage };
