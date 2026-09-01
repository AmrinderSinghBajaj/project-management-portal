export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE || (import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/api\/?$/, '') : 'http://localhost:5000');
