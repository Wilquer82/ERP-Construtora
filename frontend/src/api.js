import axios from 'axios';

// frontend/src/api.js
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, '').endsWith('/api')
    ? configuredApiUrl.replace(/\/$/, '')
    : `${configuredApiUrl.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl
});

// Injeta token JWT em toda requisicao
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (import.meta.env.DEV) {
      console.error('[API Error]', err.config?.url, err.response?.status, err.response?.statusText, err.message);
    }
    return Promise.reject(err);
  }
);

export const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export const fmtData = (d) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '-';



export default api;
