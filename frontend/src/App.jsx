import { useState, useEffect } from "react";
import ApplyLeave from "./components/ApplyLeave";
import MyLeaveRequests from "./components/MyLeaveRequests";
import AdminLeaveManagement from "./components/AdminLeaveManagement";
import illustration from "./assets/login.png";
import "./App.css";

// ================= VALIDATION HELPERS =================
// Client-side validators for auth forms.
// Each returns an error string, or "" when valid.

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s.'-]+$/;

const LIMITS = {
  NAME_MIN: 3,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 72, // BCrypt limit
};

function validateName(value) {
  const raw = value ?? "";
  const v = raw.trim();
  if (!v) return "Full name is required.";
  // REQUIREMENT: Name input must NOT allow numbers - only letters!
  if (/\d/.test(raw)) return "Numbers are not allowed in name. Please use only letters.";
  if (v.length < LIMITS.NAME_MIN) return `Name must be at least ${LIMITS.NAME_MIN} characters.`;
  if (v.length > LIMITS.NAME_MAX) return `Name must be at most ${LIMITS.NAME_MAX} characters.`;
  if (!NAME_REGEX.test(v)) return "Name can contain only letters, spaces, . ' and -.";
  return "";
}

function validateEmail(value) {
  const v = (value ?? "").trim();
  if (!v) return "Email is required.";
  if (v.length > LIMITS.EMAIL_MAX) return "Email is too long.";
  if (!EMAIL_REGEX.test(v)) return "Enter a valid email address (e.g. you@example.com).";
  return "";
}

// mode: "login" -> only presence; "register" / "reset" -> full strength rules
function validatePassword(value, mode = "register") {
  const v = value ?? "";
  if (!v) return "Password is required.";
  if (v.length > LIMITS.PASSWORD_MAX) return `Password must be at most ${LIMITS.PASSWORD_MAX} characters.`;
  if (mode === "login") return "";

  if (v.length < LIMITS.PASSWORD_MIN) return `Password must be at least ${LIMITS.PASSWORD_MIN} characters.`;
  if (/\s/.test(v)) return "Password must not contain spaces.";
  if (!/[a-z]/.test(v)) return "Password needs at least one lowercase letter.";
  if (!/[A-Z]/.test(v)) return "Password needs at least one uppercase letter.";
  if (!/\d/.test(v)) return "Password needs at least one number.";
  return "";
}

function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return "";
}

// Returns an object of { field: errorMessage } for only the invalid fields.
function validateAuthForm(values, isLogin, isForgotPassword = false) {
  const errors = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;

  if (isForgotPassword) {
    const password = validatePassword(values.password, "reset");
    if (password) errors.password = password;
    const confirm = validateConfirmPassword(values.password, values.confirmPassword);
    if (confirm) errors.confirmPassword = confirm;
    return errors;
  }

  const password = validatePassword(values.password, isLogin ? "login" : "register");
  if (password) errors.password = password;

  if (!isLogin) {
    const name = validateName(values.name);
    if (name) errors.name = name;
    const confirm = validateConfirmPassword(values.password, values.confirmPassword);
    if (confirm) errors.confirmPassword = confirm;
  }
  return errors;
}

// 0–4 score for a strength meter.
function passwordStrength(value) {
  const v = value ?? "";
  let score = 0;
  if (v.length >= LIMITS.PASSWORD_MIN) score++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  return score;
}
// ======================================================

const API_URL = "http://localhost:8080/api/auth";
const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

const EMPTY_FORM = { name: "", email: "", password: "", confirmPassword: "" };

function loadSavedUser() {
  try {
    const saved = localStorage.getItem("leaveUser");
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem("leaveUser");
    localStorage.removeItem("leaveToken");
    return null;
  }
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
  const [activeTab, setActiveTab] = useState("EMPLOYEE"); // "EMPLOYEE" or "ADMIN"
  const [user, setUser] = useState(loadSavedUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch(`${API_URL}/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const currentUser = await response.json();

        localStorage.setItem("leaveUser", JSON.stringify(currentUser));
        setUser(currentUser);

        setActiveTab(
          currentUser.role === "ADMIN" ? "ADMIN" : "EMPLOYEE"
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
        const response = await fetch(`${API_URL}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: cleaned.email,
            newPassword: cleaned.password,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || data.detail || "Unable to reset password. Please check your email.");
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

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors && typeof data.errors === "object" && !Array.isArray(data.errors)) {
          setErrors((prev) => ({ ...prev, ...data.errors }));
        }
        const fallback =
          response.status === 401
            ? "Invalid email or password."
            : response.status === 409
            ? "An account with this email already exists."
            : "Authentication failed. Please try again.";
        throw new Error(data.message || data.detail || fallback);
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

      localStorage.setItem("leaveUser", JSON.stringify(data));
      if (data.token) {
        localStorage.setItem("leaveToken", data.token);
      }

      // Show "Login Successfully" Popup modal and proceed to Dashboard!
      setPopup({
        show: true,
        title: "Login Successful!",
        message: `Welcome back, ${data.name || data.email}! Your session is active.`,
        btnText: "Open Dashboard →",
        onConfirm: () => {
          setPopup({ show: false, title: "", message: "", btnText: "", onConfirm: null });
          setUser(data);
          setActiveTab(data.role === "ADMIN" ? "ADMIN" : "EMPLOYEE");
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
            ? "Cannot connect to backend. Ensure Spring Boot is running on port 8080."
            : error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
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

  // Helper for user avatar initials
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : "U";
  };

  // Get formatted today date
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());

  // ---------- DASHBOARD LAYOUT ----------
  if (user) {
    const isAdmin = user.role === "ADMIN";
    const initials = getInitials(user.name, user.email);

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

          <div className="mobile-avatar-pill">
            <span className="avatar-circle-sm">{initials}</span>
          </div>
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
            </nav>
          </div>

          {/* User Profile Card at bottom of sidebar */}
          <div className="sidebar-user-footer">
            <div className="user-profile-card">
              <div className="avatar-circle">{initials}</div>
              <div className="user-info-text">
                <p className="user-name-label">{user.name || "Employee"}</p>
                <p className="user-email-label">{user.email}</p>
                <span className={`role-pill ${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
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
                {isAdmin && activeTab === "ADMIN" ? "Admin Management Portal" : "Employee Leave Dashboard"}
              </h1>
              <p className="topbar-subtitle">
                {isAdmin && activeTab === "ADMIN"
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
            </div>
          </header>

          {/* Welcome Greeting Banner */}
          <section className="welcome-banner-card">
            <div className="welcome-banner-content">
              <span className="welcome-tag-pill">PORTAL ACTIVE</span>
              <h2>Welcome back, {user.name || user.email}!</h2>
              <p>
                {isAdmin && activeTab === "ADMIN"
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
            {isAdmin && activeTab === "ADMIN" ? (
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
