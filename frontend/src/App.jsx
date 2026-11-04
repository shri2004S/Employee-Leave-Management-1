import { useState } from "react";
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

const response = await fetch(`${API_URL}/${endpoint}`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});


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
      setMessage({ type: "error", text: "Please fix the highlighted fields." });
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
          message: "Your password has been updated. Please sign in with your new password.",
          btnText: "Proceed to Login →",
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
          title: "Registered Successfully!",
          message: "Your employee account has been created. Please sign in to access your dashboard.",
          btnText: "Go to Login →",
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
        title: "Login Successfully!",
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
        {errors[field]}
      </span>
    ) : null;

  const strength = passwordStrength(form.password);

  // ---------- dashboard ----------
  if (user) {
    const isAdmin = user.role === "ADMIN";

    return (
      <div className="dashboard">
        <header className="topbar">
          <div className="brand">
            <span className="brand-icon">L</span>
            <span>LeaveManagement</span>
            <span className="role-tag">{user.role}</span>
          </div>

          <div className="topbar-actions">
            {isAdmin && (
              <div className="portal-switcher">
                <button
                  className={`switch-tab ${activeTab === "ADMIN" ? "active" : ""}`}
                  onClick={() => setActiveTab("ADMIN")}
                >
                  🏢 Admin Portal
                </button>
                <button
                  className={`switch-tab ${activeTab === "EMPLOYEE" ? "active" : ""}`}
                  onClick={() => setActiveTab("EMPLOYEE")}
                >
                  👤 My Leave View
                </button>
              </div>
            )}
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <p className="eyebrow">
            {isAdmin && activeTab === "ADMIN"
              ? "ADMINISTRATION DASHBOARD"
              : "EMPLOYEE DASHBOARD"}
          </p>
          <h1>Welcome, {user.name || user.email}!</h1>
          <p className="subtitle">
            {isAdmin && activeTab === "ADMIN"
              ? "Manage and review organization-wide leave requests with approve/reject workflow."
              : "Submit new leave requests, monitor approvals, or update pending applications."}
          </p>

          {isAdmin && activeTab === "ADMIN" ? (
            <AdminLeaveManagement />
          ) : (
            <>
              <ApplyLeave onLeaveSubmitted={handleLeaveSubmitted} />
              <MyLeaveRequests refreshTrigger={refreshTrigger} />
            </>
          )}
        </main>
      </div>
    );
  }

  // ---------- auth screen ----------
  return (
    <div className="page">
      {/* JavaScript Popup Modal for React */}
      {popup.show && (
        <div className="react-popup-overlay">
          <div className="react-popup-box">
            <div className="react-popup-icon">✓</div>
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

      <section className="intro-panel">
        <div className="brand">
          <span className="brand-icon">L</span> LeaveManagement
        </div>
        <div className="intro-content">
          <span className="intro-tag">EMPLOYEE LEAVE MANAGEMENT SYSTEM</span>
          <h1> </h1>
          <img
            src={illustration}
            alt="Employee Leave Management Illustration"
            className="auth-illustration"
          />
        </div>
      </section>

      <section className="form-panel">
        <div className="auth-card">
          <div className="mobile-brand brand">
            <span className="brand-icon">L</span> LeaveManagement
          </div>

          <p className="eyebrow">
            {isForgotPassword
              ? "PASSWORD RECOVERY"
              : isLogin
              ? "WELCOME BACK"
              : "GET STARTED"}
          </p>
          <h2>
            {isForgotPassword
              ? "Reset your password"
              : isLogin
              ? "Sign in to your account"
              : "Create your account"}
          </h2>
          <p className="form-subtitle">
            {isForgotPassword
              ? "Enter your registered email and choose a new password."
              : isLogin
              ? "Enter your credentials to access the portal."
              : "Register as an employee to get started."}
          </p>

          {!isForgotPassword && (
            <div className="auth-tabs">
              <button
                className={isLogin ? "active" : ""}
                onClick={() => switchMode(true)}
                type="button"
              >
                Login
              </button>
              <button
                className={!isLogin ? "active" : ""}
                onClick={() => switchMode(false)}
                type="button"
              >
                Register
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {!isLogin && !isForgotPassword && (
              <label>
                Full name (Letters only)
                <input
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  maxLength={LIMITS.NAME_MAX}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^A-Za-z\s.'-]/g, "");
                  }}
                  {...fieldProps("name")}
                />
                {renderError("name")}
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={LIMITS.EMAIL_MAX}
                {...fieldProps("email")}
              />
              {renderError("email")}
            </label>

            <label>
              {isForgotPassword ? "New password" : "Password"}
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isLogin && !isForgotPassword
                      ? "Enter your password"
                      : "Create a strong password"
                  }
                  autoComplete={isLogin && !isForgotPassword ? "current-password" : "new-password"}
                  maxLength={LIMITS.PASSWORD_MAX}
                  {...fieldProps("password")}
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {renderError("password")}

              {(!isLogin || isForgotPassword) && form.password && (
                <div className="strength" aria-live="polite">
                  <div className="strength-bar">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={i <= strength ? `on s${strength}` : ""} />
                    ))}
                  </div>
                  <small>{STRENGTH_LABELS[strength]}</small>
                </div>
              )}
              {(!isLogin || isForgotPassword) && (
                <small className="hint">
                  {LIMITS.PASSWORD_MIN}+ chars with uppercase, lowercase, &amp; number.
                </small>
              )}
            </label>

            {/* Forgot password trigger link for login screen */}
            {isLogin && !isForgotPassword && (
              <div className="forgot-password-link-container">
                <button
                  type="button"
                  className="text-link"
                  onClick={openForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {(!isLogin || isForgotPassword) && (
              <label>
                {isForgotPassword ? "Confirm new password" : "Confirm password"}
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  maxLength={LIMITS.PASSWORD_MAX}
                  {...fieldProps("confirmPassword")}
                />
                {renderError("confirmPassword")}
              </label>
            )}

            {message.text && (
              <p className={`message ${message.type === "success" ? "success" : ""}`} role="alert">
                {message.text}
              </p>
            )}

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isForgotPassword
                ? "Reset Password →"
                : isLogin
                ? "Sign In →"
                : "Create Account →"}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                className="back-btn"
                onClick={() => switchMode(true)}
              >
                ← Back to Login
              </button>
            )}
          </form>

          <p className="security-note"></p>
        </div>
      </section>
    </div>
  );
}

export default App;
