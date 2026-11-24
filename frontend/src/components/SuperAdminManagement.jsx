import { useState, useEffect } from "react";
import { ADMIN_USERS_API_URL, api } from "../apiConfig";
import "./SuperAdminManagement.css";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export default function SuperAdminManagement({ user }) {
  const isSuperAdmin = user?.email?.trim().toLowerCase() === "superadmin@gmail.com";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminsError, setAdminsError] = useState("");

  async function fetchAdmins() {
    if (!isSuperAdmin) return;
    setLoadingAdmins(true);
    setAdminsError("");
    try {
      const res = await api.get(`${ADMIN_USERS_API_URL}/admins`);
      setAdmins(res.data || []);
    } catch (err) {
      setAdminsError(err.response?.data?.message || err.message || "Failed to load admin users.");
    } finally {
      setLoadingAdmins(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (isSuperAdmin) {
      api.get(`${ADMIN_USERS_API_URL}/admins`)
        .then((res) => {
          if (active) setAdmins(res.data || []);
        })
        .catch((err) => {
          if (active) setAdminsError(err.response?.data?.message || err.message || "Failed to load admin users.");
        });
    }
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address (e.g. admin@settribe.com).");
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!/[a-z]/.test(cleanPassword) || !/[A-Z]/.test(cleanPassword) || !/\d/.test(cleanPassword)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`${ADMIN_USERS_API_URL}/create-admin`, {
        email: cleanEmail,
        password: cleanPassword,
      });
      setSuccess(res.data?.message || `Admin account for ${cleanEmail} created successfully!`);
      setEmail("");
      setPassword("");
      fetchAdmins();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create administrator account.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const getInitials = (name, mail) => {
    if (mail?.trim().toLowerCase() === "superadmin@gmail.com") return "SA";
    if (name) {
      const cleaned = name.replace(/[()]/g, "").trim();
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return cleaned.slice(0, 2).toUpperCase();
    }
    return mail ? mail.slice(0, 2).toUpperCase() : "AD";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Active Admin";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Active Admin";
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="superadmin-access-denied">
        <div className="access-denied-box">
          <div className="access-denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>This page is restricted to the Super Admin (superadmin@gmail.com) only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-page-container">
      {/* Hero Header */}
      <div className="superadmin-hero-banner">
        <div className="superadmin-hero-content">
          <span className="superadmin-crown-badge">
            <span className="crown-icon">👑</span> SUPER ADMIN DASHBOARD
          </span>
          <h1 className="superadmin-page-title">Add Administrator User</h1>
          <p className="superadmin-page-subtitle">
            Create official administrator accounts using only <strong>Email</strong> and <strong>Password</strong>.
            New administrators will immediately receive full approval and leave management rights across the organization.
          </p>
        </div>
      </div>

      {/* Main Grid: Left = Add Form, Right = Info Card */}
      <div className="superadmin-content-grid">
        <div className="superadmin-card form-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-heading">Create Admin Account</h2>
              <p className="card-subheading">Enter login credentials for the new administrator.</p>
            </div>
            <span className="card-tag-pill">Super Admin Action</span>
          </div>

          {success && (
            <div className="superadmin-alert success" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="superadmin-alert error" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateAdmin} className="superadmin-create-form" noValidate>
            <div className="superadmin-field">
              <label htmlFor="superadmin-email-input">
                Admin Email ID <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  id="superadmin-email-input"
                  type="email"
                  required
                  placeholder="e.g. admin@settribe.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                />
              </div>
              <span className="field-hint">The administrator will log in using this email address.</span>
            </div>

            <div className="superadmin-field">
              <label htmlFor="superadmin-password-input">
                Password <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  id="superadmin-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="e.g. Password@123"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <span className="field-hint">Must contain at least 6 characters, uppercase, lowercase, and a number.</span>
            </div>

            <div className="superadmin-form-actions">
              <button
                type="submit"
                className="superadmin-primary-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Creating Admin...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Create Admin Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Access Info Card */}
        <div className="superadmin-card info-card">
          <h3 className="info-card-title">Super Admin Security &amp; Privileges</h3>
          <ul className="info-feature-list">
            <li>
              <div className="feature-icon-bullet blue">✓</div>
              <div>
                <strong>Email &amp; Password Provisioning</strong>
                <p>Only email and password are required. The display name is generated automatically.</p>
              </div>
            </li>
            <li>
              <div className="feature-icon-bullet purple">👑</div>
              <div>
                <strong>Super Admin Exclusive</strong>
                <p>Regular administrators cannot create accounts, modify roles, or access this page.</p>
              </div>
            </li>
            <li>
              <div className="feature-icon-bullet green">⚡</div>
              <div>
                <strong>Instant Portal Access</strong>
                <p>Newly created admins can immediately log in and review employee leave requests.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Registered Administrators Section */}
      <div className="superadmin-card admins-list-card">
        <div className="admins-list-header">
          <div>
            <h2 className="card-heading">Registered Administrators ({admins.length})</h2>
            <p className="card-subheading">All administrative accounts active on LeaveHub.</p>
          </div>
          <button
            className="admins-refresh-btn"
            onClick={fetchAdmins}
            disabled={loadingAdmins}
            title="Refresh administrators list"
          >
            <svg className={loadingAdmins ? "spin" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {adminsError && (
          <div className="superadmin-alert error" style={{ margin: "16px 0" }}>
            <span>{adminsError}</span>
          </div>
        )}

        {loadingAdmins && admins.length === 0 ? (
          <div className="admins-loading-state">
            <span className="btn-spinner large"></span>
            <p>Loading administrators list...</p>
          </div>
        ) : (
          <div className="admins-cards-grid">
            {admins.map((adm) => {
              const isItemSuper = adm.email?.trim().toLowerCase() === "superadmin@gmail.com";
              const admName = isItemSuper ? "Super Admin" : adm.name;
              const admInitials = getInitials(admName, adm.email);

              return (
                <div key={adm.id} className={`admin-member-card ${isItemSuper ? "super-admin-card" : ""}`}>
                  <div className="admin-member-avatar">{admInitials}</div>
                  <div className="admin-member-details">
                    <div className="admin-member-name-row">
                      <h4 className="admin-member-name">{admName}</h4>
                      <span className={`admin-member-badge ${isItemSuper ? "super" : "standard"}`}>
                        {isItemSuper ? "SUPER ADMIN" : "ADMIN"}
                      </span>
                    </div>
                    <p className="admin-member-email">{adm.email}</p>
                    <div className="admin-member-meta">
                      <span className="status-indicator">
                        <span className="status-dot"></span> Active
                      </span>
                      <span className="date-indicator">
                        {adm.createdAt ? formatDate(adm.createdAt) : "Active Admin"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
