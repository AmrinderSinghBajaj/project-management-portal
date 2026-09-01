const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = isLocalhost 
  ? (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api')
  : '/api';

export const SERVER_BASE = isLocalhost
  ? 'http://localhost:5000'
  : (typeof window !== 'undefined' ? window.location.origin : '');
