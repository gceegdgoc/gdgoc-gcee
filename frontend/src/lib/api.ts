import axios, { AxiosError } from 'axios';

export { downloadPdf } from './utils';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

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
