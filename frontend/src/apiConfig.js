// =========================================================
// Centralized API Base Configuration
// =========================================================
// - In development (npm run dev): defaults to http://localhost:8080
// - In production / Render: defaults to relative path ("") for same-origin,
//   or uses VITE_API_BASE_URL if backend is hosted separately.
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
    ? "http://localhost:8080"
    : "";

export const AUTH_API_URL = `${API_BASE}/api/auth`;
export const LEAVES_API_URL = `${API_BASE}/api/leaves`;
export const ADMIN_API_URL = `${API_BASE}/api/admin/leaves`;
