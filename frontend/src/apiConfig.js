// =========================================================
// Centralized API Base & Axios Client Configuration
// =========================================================
// - In production on Render: connects to live backend https://leavehub-backend.onrender.com
// - In local development (npm run dev): defaults to http://localhost:8080
// - Supports override via VITE_API_BASE_URL environment variable

import axios from "axios";

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
    return "https://leavehub-backend.onrender.com";
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8080";
  }
  return "https://leavehub-backend.onrender.com";
};

export const API_BASE = getApiBase();

export const AUTH_API_URL = `${API_BASE}/api/auth`;
export const LEAVES_API_URL = `${API_BASE}/api/leaves`;
export const ADMIN_API_URL = `${API_BASE}/api/admin/leaves`;

// Create standardized Axios instance
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT Bearer token into all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("leaveToken");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { axios };
export default api;


