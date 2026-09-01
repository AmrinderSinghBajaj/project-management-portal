export const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE || (import.meta.env.VITE_API_BASE && !import.meta.env.VITE_API_BASE.startsWith('/') ? import.meta.env.VITE_API_BASE.replace(/\/api\/?$/, '') : window.location.origin);

