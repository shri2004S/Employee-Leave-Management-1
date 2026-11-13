import React from "react";
import "./UserProfileModal.css";

export default function UserProfileModal({ user, onClose, onLogout }) {
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Active Member";

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal-header">
          <div className="profile-header-title">
            <span className="profile-eyebrow">USER ACCOUNT</span>
            <h2>Profile Details</h2>
          </div>
          <button className="profile-close-btn" onClick={onClose} aria-label="Close Profile">
            &times;
          </button>
        </div>

        {/* Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-avatar-circle">{initials}</div>
          <div className="profile-hero-info">
            <div className="profile-hero-name-row">
              <h3 className="profile-name">{user.name || "Employee"}</h3>
              <span className={`profile-role-badge ${user.role?.toLowerCase()}`}>
                {isAdmin ? "Administrator" : "Employee"}
              </span>
            </div>
            <p className="profile-email">{user.email}</p>
            <div className="profile-badges-row">
              <span className="profile-status-pill">
                <span className="status-dot-pulse"></span>
                Active Account
              </span>
              <span className="profile-id-pill">
                User ID: #{user.userId || user.id || "1"}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="profile-details-grid">
          <div className="profile-detail-card">
            <div className="detail-icon-wrap blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="detail-text-wrap">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{user.name || "Not provided"}</span>
            </div>
          </div>

          <div className="profile-detail-card">
            <div className="detail-icon-wrap purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="detail-text-wrap">
              <span className="detail-label">Email Address</span>
              <span className="detail-value">{user.email}</span>
            </div>
          </div>

          <div className="profile-detail-card">
            <div className="detail-icon-wrap amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div className="detail-text-wrap">
              <span className="detail-label">System Role</span>
              <span className="detail-value">
                {isAdmin ? "System Administrator (ADMIN)" : "Staff Member (EMPLOYEE)"}
              </span>
            </div>
          </div>

          <div className="profile-detail-card">
            <div className="detail-icon-wrap green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div className="detail-text-wrap">
              <span className="detail-label">Account Status</span>
              <span className="detail-value text-green">Verified & Active</span>
            </div>
          </div>

          <div className="profile-detail-card">
            <div className="detail-icon-wrap teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="detail-text-wrap">
              <span className="detail-label">Member Since</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
          </div>

          <div className="profile-detail-card">
            <div className="detail-icon-wrap indigo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div className="detail-text-wrap">
              <span className="detail-label">Security & Auth</span>
              <span className="detail-value">JWT Secure Session (HTTPS)</span>
            </div>
          </div>
        </div>

        {/* Permissions & Capabilities Box */}
        <div className="profile-permissions-box">
          <div className="permissions-box-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>Assigned Permissions & Capabilities</span>
          </div>
          <ul className="permissions-list">
            {isAdmin ? (
              <>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  Review, approve, or reject all employee leave applications organization-wide
                </li>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  Access Admin Command Center with real-time application counters and statistics
                </li>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  View full employee history, rejection notes, and audit timestamps
                </li>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  Switch between Admin View and Personal Employee Leave View anytime
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  Apply for Casual, Sick, and Earned leaves with date-range picker
                </li>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  Track real-time approval status (Pending, Approved, or Rejected)
                </li>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  Edit or cancel pending leave requests prior to administrator review
                </li>
                <li>
                  <span className="check-bullet">&#10003;</span>
                  View personal leave history and official administrative remarks
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="profile-modal-footer">
          <button className="profile-signout-btn" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
          <button className="profile-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

