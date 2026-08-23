import axios, { AxiosError } from 'axios';

export { downloadPdf } from './utils';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to attach tokens securely from localStorage
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('gdgoc_admin_token');
  const studentToken = localStorage.getItem('gdgoc_student_token');

  // Inject admin token for all /admin routes, else inject student token
  if (config.url?.startsWith('/admin')) {
    if (adminToken && config.headers) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    if (studentToken && config.headers) {
      config.headers.Authorization = `Bearer ${studentToken}`;
    }
  }
  return config;
});

// Response interceptor to handle unauthenticated sessions silently
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Optional: We can dispatch a custom event or let AuthContext handle the redirect.
      // We don't want to force redirect every 401 because it interrupts the UX of checking if logged in.
    }
    return Promise.reject(error);
  }
);

export interface ApiError {
  success: boolean;
  message: string;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<ApiError>).response?.data;
    if (data?.message) return data.message;
    if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (!err.response) return 'Cannot reach the server. Check your connection and try again.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

export function isAuthError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}
