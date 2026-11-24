import { useState, useEffect, useMemo } from "react";
import ApplyLeave from "./components/ApplyLeave";
import MyLeaveRequests from "./components/MyLeaveRequests";
import AdminLeaveManagement from "./components/AdminLeaveManagement";
import SuperAdminManagement from "./components/SuperAdminManagement";
import UserProfileModal from "./components/UserProfileModal";
import "./App.css";

import {
  EMAIL_REGEX,
  LIMITS,
  normalizeUserRole,
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateAuthForm,
  passwordStrength,
  getInitials,
} from "./utils/validationUtils";

import { AUTH_API_URL as API_URL, ADMIN_USERS_API_URL, api } from "./apiConfig";
const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

const EMPTY_FORM = { name: "", email: "", password: "", confirmPassword: "" };

function loadSavedUser() {
  try {
    const saved = localStorage.getItem("leaveUser");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return normalizeUserRole(parsed);
  } catch {
    localStorage.removeItem("leaveUser");
    localStorage.removeItem("leaveToken");
    return null;
  }
}

function getFormattedToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    const saved = loadSavedUser();
    return saved?.role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
  });
  const [user, setUser] = useState(loadSavedUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [adminModalEmail, setAdminModalEmail] = useState("");
  const [adminModalPassword, setAdminModalPassword] = useState("");
  const [adminModalLoading, setAdminModalLoading] = useState(false);
  const [adminModalError, setAdminModalError] = useState("");
  const [adminModalSuccess, setAdminModalSuccess] = useState("");

  async function handleQuickAddAdmin(e) {
    e.preventDefault();
    setAdminModalError("");
    setAdminModalSuccess("");

    const email = adminModalEmail.trim().toLowerCase();
    const password = adminModalPassword;

    if (!email || !EMAIL_REGEX.test(email)) {
      setAdminModalError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setAdminModalError("Password must be at least 6 characters.");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setAdminModalError("Password must contain uppercase, lowercase, and a number.");
      return;
    }

    setAdminModalLoading(true);
    try {
      const res = await api.post(`${ADMIN_USERS_API_URL}/create-admin`, {
        email,
        password,
      });
      setAdminModalSuccess(res.data?.message || `Admin account for ${email} created successfully!`);
      setAdminModalEmail("");
      setAdminModalPassword("");
      setTimeout(() => {
        setShowAddAdminModal(false);
        setAdminModalSuccess("");
        setActiveTab("ADMIN");
      }, 1500);
    } catch (err) {
      setAdminModalError(err.response?.data?.message || err.message || "Failed to create admin.");
    } finally {
      setAdminModalLoading(false);
    }
  }

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await api.get(`${API_URL}/me`);
        const currentUser = response.data;
        const normalized = normalizeUserRole(currentUser);

        localStorage.setItem("leaveUser", JSON.stringify(normalized));
        setUser(normalized);

        setActiveTab(
          normalized.role === "ADMIN" ? "ADMIN" : "EMPLOYEE"
        );
      } catch {
        localStorage.removeItem("leaveUser");
        localStorage.removeItem("leaveToken");
        setUser(null);
      }
    }

    verifySession();
  }, []);

  // ---------- JavaScript Popup Modal State ----------
  const [popup, setPopup] = useState({
    show: false,
    title: "",
    message: "",
    btnText: "",
    onConfirm: null,
  });

  // ---------- validation helpers ----------
  function validateField(field, values) {
    switch (field) {
      case "name":
        return validateName(values.name);
      case "email":
        return validateEmail(values.email);
      case "password":
        return validatePassword(values.password, isLogin && !isForgotPassword ? "login" : "register");
      case "confirmPassword":
        return validateConfirmPassword(values.password, values.confirmPassword);
      default:
        return "";
    }
  }

  function setFieldError(field, error) {
    setErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  }

  function handleChange(field) {
    return (event) => {
      let val = event.target.value;

      // REQUIREMENT: In name input, do NOT allow numbers - only letters!
      if (field === "name") {
        val = val.replace(/[^A-Za-z\s.'-]/g, "");
      }

      const next = { ...form, [field]: val };
      setForm(next);
      if (message.text) setMessage({ type: "", text: "" });

      // Live re-validate only fields the user has already visited
      if (touched[field]) setFieldError(field, validateField(field, next));
      // Keep confirm-password in sync while the password changes
      if (field === "password" && touched.confirmPassword && (!isLogin || isForgotPassword)) {
        setFieldError("confirmPassword", validateField("confirmPassword", next));
      }
    };
  }

  function handleBlur(field) {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setFieldError(field, validateField(field, form));
    };
  }

  function switchMode(loginMode) {
    setIsLogin(loginMode);
    setIsForgotPassword(false);
    setForm((prev) => ({ ...EMPTY_FORM, email: prev.email }));
    setErrors({});
    setTouched({});
    setShowPassword(false);
    setMessage({ type: "", text: "" });
  }

  function openForgotPassword() {
    setIsForgotPassword(true);
    setForm((prev) => ({ ...EMPTY_FORM, email: prev.email }));
    setErrors({});
    setTouched({});
    setShowPassword(false);
    setMessage({ type: "", text: "" });
  }

  // ---------- submit ----------
  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const cleaned = {
      ...form,
      name: form.name.trim().replace(/\s+/g, " "),
      email: form.email.trim().toLowerCase(),
    };

    const validationErrors = validateAuthForm(cleaned, isLogin, isForgotPassword);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setMessage({ type: "error", text: "Please fix the highlighted fields below." });
      const firstInvalid = ["name", "email", "password", "confirmPassword"].find(
        (f) => validationErrors[f]
      );
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }

    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      // 1. FORGOT PASSWORD FLOW
      if (isForgotPassword) {
        try {
          await api.post(`${API_URL}/forgot-password`, {
            email: cleaned.email,
            newPassword: cleaned.password,
          });
        } catch (err) {
          const resData = err.response?.data || {};
          throw new Error(resData.message || resData.detail || "Unable to reset password. Please check your email.");
        }

        // On reset success: Show popup modal
        setPopup({
          show: true,
          title: "Password Reset Successfully!",
          message: "Your password has been securely updated. Please sign in with your new credentials.",
          btnText: "Proceed to Sign In →",
          onConfirm: () => {
            setPopup({ show: false, title: "", message: "", btnText: "", onConfirm: null });
            setIsForgotPassword(false);
            setIsLogin(true);
            setForm({ ...EMPTY_FORM, email: cleaned.email });
            setErrors({});
            setTouched({});
          },
        });
        return;
      }

      // 2. LOGIN / REGISTER FLOW
      const endpoint = isLogin ? "login" : "register";
      const body = isLogin
        ? { email: cleaned.email, password: cleaned.password }
        : { name: cleaned.name, email: cleaned.email, password: cleaned.password };

      let data;
      try {
        const response = await api.post(`${API_URL}/${endpoint}`, body);
        data = response.data;
      } catch (err) {
        if (!err.response || err.message === "Network Error" || err.code === "ERR_NETWORK") {
          throw new Error(
            typeof window !== "undefined" && window.location.hostname.includes("onrender.com")
              ? "Cannot reach backend. If the free server instance was sleeping on Render, please wait ~20-30 seconds and try again."
              : "Cannot connect to backend server. Ensure Spring Boot is running on port 8080."
          );
        }
        const resData = err.response?.data || {};
        const status = err.response?.status;
        if (resData.errors && typeof resData.errors === "object" && !Array.isArray(resData.errors)) {
          setErrors((prev) => ({ ...prev, ...resData.errors }));
        }
        const fallback =
          status === 401
            ? "Invalid email or password."
            : status === 409
            ? "An account with this email already exists. Please sign in instead."
            : status === 500
            ? "Backend database or server error. Please check server logs."
            : "Authentication failed. Please try again.";
        const rawMsg = resData.message || resData.detail;
        const finalMsg =
          rawMsg && rawMsg !== "No message available" ? rawMsg : fallback;
        throw new Error(finalMsg);
      }

      if (!isLogin) {
        // REQUIREMENT: When user clicks Register, do NOT open dashboard directly!
        // Show "Register Successfully" Popup modal and switch to Login!
        setPopup({
          show: true,
          title: "Account Created Successfully!",
          message: "Your employee account has been created. Please sign in to access your portal.",
          btnText: "Go to Sign In →",
          onConfirm: () => {
            setPopup({ show: false, title: "", message: "", btnText: "", onConfirm: null });
            setIsLogin(true);
            setForm({ ...EMPTY_FORM, email: cleaned.email });
            setErrors({});
            setTouched({});
          },
        });
        return;
      }

      const normalizedUser = normalizeUserRole(data);

      localStorage.setItem("leaveUser", JSON.stringify(normalizedUser));
      if (normalizedUser.token) {
        localStorage.setItem("leaveToken", normalizedUser.token);
      }

      // Show "Login Successfully" Popup modal and proceed to Dashboard!
      setPopup({
        show: true,
        title: "Login Successful!",
        message: `Welcome back, ${normalizedUser.name || normalizedUser.email}! Your session is active.`,
        btnText: "Open Dashboard →",
        onConfirm: () => {
          setPopup({ show: false, title: "", message: "", btnText: "", onConfirm: null });
          setUser(normalizedUser);
          setActiveTab(normalizedUser.role === "ADMIN" ? "ADMIN" : "EMPLOYEE");
          setForm(EMPTY_FORM);
          setErrors({});
          setTouched({});
        },
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof TypeError || error.message === "Failed to fetch"
            ? (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")
                ? "Cannot reach backend. If the free server instance was sleeping on Render, please wait ~20-30 seconds and try again."
                : "Cannot connect to backend. Ensure Spring Boot is running on port 8080.")
            : error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post(`${API_URL}/logout`);
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("leaveToken");
      localStorage.removeItem("leaveUser");

      setUser(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setTouched({});
      setMessage({ type: "", text: "" });
      setActiveTab("EMPLOYEE");
      setIsSidebarOpen(false);
    }
  }

  function handleLeaveSubmitted() {
    setRefreshTrigger((prev) => prev + 1);
  }

  // ---------- reusable field-error renderer ----------
  const fieldProps = (field) => ({
    id: `field-${field}`,
    value: form[field],
    onChange: handleChange(field),
    onBlur: handleBlur(field),
    className: touched[field] && errors[field] ? "invalid" : "",
    "aria-invalid": Boolean(touched[field] && errors[field]),
    "aria-describedby": errors[field] ? `error-${field}` : undefined,
    disabled: loading,
  });

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <span id={`error-${field}`} className="field-error" role="alert">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {errors[field]}
      </span>
    ) : null;

  const strength = passwordStrength(form.password);

  // Get formatted today date
  const todayFormatted = useMemo(() => getFormattedToday(), []);

  // ---------- DASHBOARD LAYOUT ----------
  if (user) {
    const isAdmin = user.role === "ADMIN";
    const isSuperAdmin = user?.email?.trim().toLowerCase() === "superadmin@gmail.com";
    const displayName = isSuperAdmin ? "Super Admin" : (user?.name || "Employee");
    const displayRole = isSuperAdmin ? "SUPER ADMIN" : user?.role;
    const initials = isSuperAdmin ? "SA" : getInitials(displayName, user?.email);

    return (
      <div className="dashboard-app-container">
        {/* Mobile Header Bar */}
        <header className="mobile-header">
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Navigation Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div className="mobile-brand">
            <div className="linkedin-brand-logo dashboard-brand-logo-sm">
              <span className="logo-word-leave">Leave</span>
              <span className="logo-box-hub">Hub</span>
            </div>
          </div>

          <button
            className="mobile-avatar-pill"
            onClick={() => setShowProfileModal(true)}
            title="View Profile Details"
            aria-label="View Profile Details"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span className="avatar-circle-sm">{initials}</span>
          </button>
        </header>

        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Professional Sidebar Navigation */}
        <aside className={`app-sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
          <div className="sidebar-brand">
            <div className="linkedin-brand-logo dashboard-brand-logo">
              <span className="logo-word-leave">Leave</span>
              <span className="logo-box-hub">Hub</span>
            </div>
          </div>

          <div className="sidebar-nav-section">
            <p className="sidebar-section-title">MAIN NAVIGATION</p>
            <nav className="sidebar-menu">
              {isAdmin ? (
                <>
                  <button
                    className={`sidebar-nav-item ${activeTab === "ADMIN" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("ADMIN");
                      setIsSidebarOpen(false);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Admin Portal</span>
                    <span className="nav-badge-pill">Admin</span>
                  </button>

                  {/* SUPER ADMIN ONLY: Add Admin User Page */}
                  {isSuperAdmin && (
                    <button
                      className={`sidebar-nav-item ${activeTab === "ADD_ADMIN" ? "active" : ""}`}
                      onClick={() => {
                        setActiveTab("ADD_ADMIN");
                        setIsSidebarOpen(false);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                      <span>Add Admin User</span>
                      <span className="nav-badge-pill" style={{ background: "#4f46e5", color: "#fff" }}>Super</span>
                    </button>
                  )}

                  <button
                    className={`sidebar-nav-item ${activeTab === "EMPLOYEE" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("EMPLOYEE");
                      setIsSidebarOpen(false);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>My Leave View</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="sidebar-nav-item active"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span>Dashboard</span>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* SUPER ADMIN EXCLUSIVE SIDEBAR SECTION */}
          {user?.email?.trim().toLowerCase() === "superadmin@gmail.com" && (
            <div className="sidebar-nav-section" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px", marginTop: "14px" }}>
              <p className="sidebar-section-title" style={{ color: "#4338ca", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>SUPER ADMIN</span>
                <span style={{ fontSize: "0.65rem", background: "#eef2ff", color: "#4f46e5", padding: "1px 6px", borderRadius: "999px" }}>ONLY</span>
              </p>
              <nav className="sidebar-menu">
                <button
                  className="sidebar-nav-item"
                  style={{ background: "#eef2ff", color: "#4338ca", fontWeight: "600", border: "1px solid #c7d2fe" }}
                  onClick={() => {
                    setShowAddAdminModal(true);
                    setIsSidebarOpen(false);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  <span>+ Add Admin User</span>
                  <span className="nav-badge-pill" style={{ background: "#4f46e5", color: "#fff" }}>Super</span>
                </button>
              </nav>
            </div>
          )}

          <div className="sidebar-nav-section quick-jump-section">
            <p className="sidebar-section-title">QUICK ACCESS</p>
            <nav className="sidebar-menu">
              <a
                href="#apply-leave-section"
                className="sidebar-nav-item"
                onClick={() => {
                  if (activeTab !== "EMPLOYEE") setActiveTab("EMPLOYEE");
                  setIsSidebarOpen(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Apply for Leave</span>
              </a>

              <a
                href="#my-requests-section"
                className="sidebar-nav-item"
                onClick={() => {
                  if (activeTab !== "EMPLOYEE") setActiveTab("EMPLOYEE");
                  setIsSidebarOpen(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>My Requests History</span>
              </a>

              <button
                className={`sidebar-nav-item ${showProfileModal ? "active" : ""}`}
                onClick={() => {
                  setShowProfileModal(true);
                  setIsSidebarOpen(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>My Profile</span>
              </button>
            </nav>
          </div>

          {/* User Profile Card at bottom of sidebar */}
          <div className="sidebar-user-footer">
            <div
              className="user-profile-card clickable"
              onClick={() => setShowProfileModal(true)}
              title="Click to view full profile details"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowProfileModal(true);
                }
              }}
            >
              <div className="avatar-circle">{initials}</div>
              <div className="user-info-text">
                <p className="user-name-label">{displayName}</p>
                <p className="user-email-label">{user.email}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span className={`role-pill ${isSuperAdmin ? "super-admin" : user.role.toLowerCase()}`}>
                    {displayRole}
                  </span>
                  <span className="profile-card-action-hint">View Profile &rarr;</span>
                </div>
              </div>
            </div>

            <button className="sidebar-logout-btn" onClick={logout} title="Sign Out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="dashboard-main-wrapper">
          {/* Topbar Banner */}
          <header className="main-topbar">
            <div className="topbar-left">
              <h1 className="topbar-title">
                {isSuperAdmin && activeTab === "ADD_ADMIN"
                  ? "Super Admin Portal — Add Admin User"
                  : isAdmin && activeTab === "ADMIN"
                  ? "Admin Management Portal"
                  : "Employee Leave Dashboard"}
              </h1>
              <p className="topbar-subtitle">
                {isSuperAdmin && activeTab === "ADD_ADMIN"
                  ? "Create and manage system administrator accounts using email and password."
                  : isAdmin && activeTab === "ADMIN"
                  ? "Review, approve, or reject organization leave applications in real time."
                  : "Submit new leave applications, track approval statuses, and manage your records."}
              </p>
            </div>

            <div className="topbar-right">
              <div className="date-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{todayFormatted}</span>
              </div>

              {isAdmin && (
                <div className="portal-switch-pill">
                  <button
                    className={`switch-tab-btn ${activeTab === "ADMIN" ? "active" : ""}`}
                    onClick={() => setActiveTab("ADMIN")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Admin View</span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      className={`switch-tab-btn ${activeTab === "ADD_ADMIN" ? "active" : ""}`}
                      onClick={() => setActiveTab("ADD_ADMIN")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                      <span>Add Admin User</span>
                    </button>
                  )}

                  <button
                    className={`switch-tab-btn ${activeTab === "EMPLOYEE" ? "active" : ""}`}
                    onClick={() => setActiveTab("EMPLOYEE")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Employee View</span>
                  </button>
                </div>
              )}

              <button
                className="topbar-profile-trigger-btn"
                onClick={() => setShowProfileModal(true)}
                title="View Full Profile Details"
              >
                <div className="topbar-avatar-badge">{initials}</div>
                <div className="topbar-profile-info">
                  <span className="topbar-profile-name">{displayName}</span>
                  <span className={`topbar-role-tag ${isSuperAdmin ? "super-admin" : user.role?.toLowerCase()}`}>
                    {displayRole} Profile &rarr;
                  </span>
                </div>
              </button>
            </div>
          </header>

          {/* Welcome Greeting Banner */}
          <section className="welcome-banner-card">
            <div className="welcome-banner-content">
              <span className="welcome-tag-pill">
                {isSuperAdmin && activeTab === "ADD_ADMIN"
                  ? "SUPER ADMIN PORTAL"
                  : isAdmin && activeTab === "ADMIN"
                  ? "ADMIN PORTAL ACTIVE"
                  : "PORTAL ACTIVE"}
              </span>
              <h2>Welcome back, {displayName}!</h2>
              <p>
                {isSuperAdmin && activeTab === "ADD_ADMIN"
                  ? "You have exclusive authority to create and manage system administrator accounts using email and password."
                  : isAdmin && activeTab === "ADMIN"
                  ? "Here is your administrative command center for organizational attendance and approvals."
                  : "You can apply for casual, sick, or earned leaves below and monitor their statuses live."}
              </p>
            </div>
            <div className="welcome-banner-icon" aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
              </svg>
            </div>
          </section>

          {/* Tab Content */}
          <main className="dashboard-content-area">
            {isSuperAdmin && activeTab === "ADD_ADMIN" ? (
              <SuperAdminManagement user={user} />
            ) : isAdmin && activeTab === "ADMIN" ? (
              <AdminLeaveManagement />
            ) : (
              <>
                <div id="apply-leave-section">
                  <ApplyLeave onLeaveSubmitted={handleLeaveSubmitted} />
                </div>
                <div id="my-requests-section">
                  <MyLeaveRequests refreshTrigger={refreshTrigger} />
                </div>
              </>
            )}
          </main>
        </div>

        {/* User Profile Details Modal (Admin & Employee) */}
        {showProfileModal && (
          <UserProfileModal
            user={user}
            onClose={() => setShowProfileModal(false)}
            onLogout={logout}
          />
        )}

        {/* Super Admin Quick Add Admin Modal (ONLY for superadmin@gmail.com) */}
        {showAddAdminModal && user?.email?.trim().toLowerCase() === "superadmin@gmail.com" && (
          <div className="react-popup-overlay">
            <div className="react-popup-box" style={{ maxWidth: "440px", textAlign: "left", padding: "26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#4f46e5", background: "#eef2ff", padding: "3px 10px", borderRadius: "999px", border: "1px solid #c7d2fe" }}>
                    👑 SUPER ADMIN ONLY
                  </span>
                  <h3 style={{ margin: "8px 0 4px 0", fontSize: "1.25rem", fontWeight: "700", color: "#0f172a" }}>
                    Add Admin User
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                    Create an Administrator using only Email and Password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddAdminModal(false); setAdminModalError(""); setAdminModalSuccess(""); }}
                  style={{ background: "transparent", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {adminModalSuccess && (
                <div style={{ padding: "10px 14px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "14px" }}>
                  ✓ {adminModalSuccess}
                </div>
              )}

              {adminModalError && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "14px" }}>
                  ⚠ {adminModalError}
                </div>
              )}

              <form onSubmit={handleQuickAddAdmin}>
                <div style={{ marginBottom: "14px" }}>
                  <label htmlFor="quickAdminEmail" style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                    Admin Email ID *
                  </label>
                  <input
                    id="quickAdminEmail"
                    type="email"
                    required
                    placeholder="e.g. admin@settribe.com"
                    value={adminModalEmail}
                    onChange={(e) => setAdminModalEmail(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <label htmlFor="quickAdminPassword" style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                    Password *
                  </label>
                  <input
                    id="quickAdminPassword"
                    type="password"
                    required
                    placeholder="e.g. Password@123"
                    value={adminModalPassword}
                    onChange={(e) => setAdminModalPassword(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }}
                  />
                  <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Must be at least 6 characters with uppercase, lowercase, and a number.
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => { setShowAddAdminModal(false); setAdminModalError(""); setAdminModalSuccess(""); }}
                    style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminModalLoading}
                    style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "#4f46e5", color: "#fff", fontWeight: "600", cursor: "pointer" }}
                  >
                    {adminModalLoading ? "Creating..." : "Create Admin Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- AUTH SCREEN (LINKEDIN-STYLE CLEAN AUTH) ----------
  return (
    <div className="linkedin-auth-page">
      {/* JavaScript Popup Modal for React */}
      {popup.show && (
        <div className="react-popup-overlay">
          <div className="react-popup-box">
            <div className="react-popup-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 className="react-popup-title">{popup.title}</h3>
            <p className="react-popup-msg">{popup.message}</p>
            <button
              type="button"
              className="react-popup-btn"
              onClick={popup.onConfirm}
            >
              {popup.btnText}
            </button>
          </div>
        </div>
      )}

      {/* Top Header with LeaveHub Logo */}
      <header className="linkedin-top-header">
        <div
          className="linkedin-brand-logo"
          onClick={() => switchMode(true)}
          role="button"
          tabIndex={0}
          title="LeaveHub Home"
        >
          <span className="logo-word-leave">Leave</span>
          <span className="logo-box-hub">Hub</span>
        </div>
      </header>

      {/* Main Container with Centered Card */}
      <main className="linkedin-auth-main">
        <div className="linkedin-card">
          <h1 className="linkedin-card-title">
            {isForgotPassword
              ? "Forgot password?"
              : isLogin
              ? "Sign in"
              : "Register"}
          </h1>
          <p className="linkedin-card-subtitle">
            {isForgotPassword
              ? "Reset your password to regain access to your portal"
              : isLogin
              ? "Stay updated on your leave & attendance portal"
              : "Create your account to manage leave requests and balance"}
          </p>

          <form onSubmit={handleSubmit} noValidate className="linkedin-form">
            {/* Full Name Field (Register Only) */}
            {!isLogin && !isForgotPassword && (
              <div className="linkedin-form-group">
                <div className="linkedin-input-wrapper">
                  <input
                    type="text"
                    placeholder="Full name (letters only)"
                    autoComplete="name"
                    maxLength={LIMITS.NAME_MAX}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^A-Za-z\s.'-]/g, "");
                    }}
                    {...fieldProps("name")}
                  />
                </div>
                {renderError("name")}
              </div>
            )}

            {/* Email Field */}
            <div className="linkedin-form-group">
              <div className="linkedin-input-wrapper">
                <input
                  type="email"
                  placeholder="Email or username"
                  autoComplete="email"
                  maxLength={LIMITS.EMAIL_MAX}
                  {...fieldProps("email")}
                />
              </div>
              {renderError("email")}
            </div>

            {/* Password Field */}
            <div className="linkedin-form-group">
              <div className="linkedin-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isLogin && !isForgotPassword
                      ? "Password"
                      : "Create password (min. 6 characters)"
                  }
                  autoComplete={isLogin && !isForgotPassword ? "current-password" : "new-password"}
                  maxLength={LIMITS.PASSWORD_MAX}
                  {...fieldProps("password")}
                />
                <button
                  type="button"
                  className="linkedin-password-toggle-text"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
              {renderError("password")}

              {/* Password strength meter */}
              {(!isLogin || isForgotPassword) && form.password && (
                <div className="strength-meter-box" aria-live="polite">
                  <div className="strength-segments">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`seg ${i <= strength ? `active s${strength}` : ""}`} />
                    ))}
                  </div>
                  <div className="strength-label-text">
                    Strength: <strong>{STRENGTH_LABELS[strength]}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field (Register & Forgot Password) */}
            {(!isLogin || isForgotPassword) && (
              <div className="linkedin-form-group">
                <div className="linkedin-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    maxLength={LIMITS.PASSWORD_MAX}
                    {...fieldProps("confirmPassword")}
                  />
                </div>
                {renderError("confirmPassword")}
              </div>
            )}

            {/* Forgot password link below password field */}
            {isLogin && !isForgotPassword && (
              <div className="linkedin-forgot-row">
                <button
                  type="button"
                  className="linkedin-forgot-link"
                  onClick={openForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Server Error / Success Message */}
            {message.text && (
              <div className={`form-feedback-alert ${message.type === "success" ? "success" : "error"}`} role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{message.text}</span>
              </div>
            )}

            {/* Primary Action Button (Pill shape) */}
            <button className="linkedin-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading-flex">
                  <span className="spinner-circle"></span>
                  Processing...
                </span>
              ) : isForgotPassword ? (
                "Reset password"
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Register"
              )}
            </button>


            {isForgotPassword && (
              <button
                type="button"
                className="linkedin-back-btn"
                onClick={() => switchMode(true)}
              >
                Back to Sign in
              </button>
            )}
          </form>
        </div>

        {/* Switch mode below card */}
        <div className="linkedin-switch-row">
          {isForgotPassword ? (
            <p>
              Remember your password?{" "}
              <button type="button" className="linkedin-join-link" onClick={() => switchMode(true)}>
                Sign in
              </button>
            </p>
          ) : isLogin ? (
            <p>
              New to LeaveHub?{" "}
              <button type="button" className="linkedin-join-link" onClick={() => switchMode(false)}>
                Register
              </button>
            </p>
          ) : (
            <p>
              Already on LeaveHub?{" "}
              <button type="button" className="linkedin-join-link" onClick={() => switchMode(true)}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
