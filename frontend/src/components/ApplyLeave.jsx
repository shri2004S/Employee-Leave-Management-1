import { useEffect, useMemo, useState } from "react";
import "./ApplyLeave.css";

import { LEAVES_API_URL as API_URL } from "../apiConfig";

function ApplyLeave({ onLeaveSubmitted }) {
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  // Approver / Admin Selection States
  const [admins, setAdmins] = useState([]);
  const [assignedAdmin, setAssignedAdmin] = useState("All Admins (Default)");

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  // Fetch available Admins from backend
  useEffect(() => {
    async function fetchAdmins() {
      try {
        const token = localStorage.getItem("leaveToken");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/admins`, {
          credentials: "include",
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setAdmins(data);
          }
        }
      } catch (err) {
        console.error("Failed to load admins:", err);
      }
    }

    fetchAdmins();
  }, []);

  // Display admins with standard fallback if database is loading
  const displayAdmins =
    admins.length > 0
      ? admins
      : [
          { id: 1, name: "New Admin", email: "newadmin@gmail.com", role: "ADMIN" },
          { id: 2, name: "System Admin", email: "admin@settribe.com", role: "ADMIN" },
          { id: 3, name: "Admin User", email: "admin@gmail.com", role: "ADMIN" },
        ];

  const leaveDays = useMemo(() => {
    if (!fromDate || !toDate || toDate < fromDate) return 0;

    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    return Math.round((end - start) / 86400000) + 1;
  }, [fromDate, toDate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (fromDate < localToday) {
      setMessageType("error");
      setMessage("Start date cannot be in the past.");
      return;
    }

    if (toDate < fromDate) {
      setMessageType("error");
      setMessage("End date cannot be before the start date.");
      return;
    }

    if (!reason.trim()) {
      setMessageType("error");
      setMessage("Please enter a reason for your leave request.");
      return;
    }

    const token = localStorage.getItem("leaveToken");
    const user = localStorage.getItem("leaveUser");

    if (!token && !user) {
      setMessageType("error");
      setMessage("Please log in again before applying for leave.");
      return;
    }

    const leaveData = {
      leaveType,
      fromDate,
      toDate,
      reason: reason.trim(),
      assignedAdmin: assignedAdmin || "All Admins (Default)",
    };

    setLoading(true);

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(leaveData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.detail ||
          `Unable to submit leave request (${response.status}).`
        );
      }

      setMessageType("success");
      setMessage(
        `Leave request submitted successfully to ${assignedAdmin}! Your application is now PENDING review.`
      );
      setLeaveType("CASUAL");
      setFromDate("");
      setToDate("");
      setReason("");
      if (onLeaveSubmitted) {
        onLeaveSubmitted();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the leave API. Check that Spring Boot is running on port 8080."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  const leaveTypeOptions = [
    { value: "CASUAL", label: "Casual Leave", desc: "Short personal time off" },
    { value: "SICK", label: "Sick Leave", desc: "Medical or health recovery" },
    { value: "EARNED", label: "Earned Leave", desc: "Annual accrued vacation" },
    { value: "OTHER", label: "Other / Special", desc: "Special circumstances" },
  ];

  const renderCategoryLogo = (type) => {
    switch (type) {
      case "CASUAL":
        return (
          <div className="type-pill-icon-box casual">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
        );
      case "SICK":
        return (
          <div className="type-pill-icon-box sick">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
        );
      case "EARNED":
        return (
          <div className="type-pill-icon-box earned">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
        );
      case "OTHER":
      default:
        return (
          <div className="type-pill-icon-box other">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
        );
    }
  };

  return (
    <section className="apply-leave-card-panel">
      {/* Card Header */}
      <div className="card-top-header">
        <div className="header-text-block">
          <h2>Apply for Leave</h2>
          <p className="card-subtitle-desc">
            Complete the form below to request time off. Select which administrator or manager should review your request.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="apply-form-container">
        {/* 1. Leave Type Selector with Interactive Cards */}
        <div className="form-section-block">
          <label className="section-field-label">Select Leave Category</label>
          <div className="type-pills-grid">
            {leaveTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`type-pill-card ${leaveType === opt.value ? "selected" : ""}`}
                onClick={() => setLeaveType(opt.value)}
              >
                {renderCategoryLogo(opt.value)}
                <div className="type-pill-text">
                  <strong>{opt.label}</strong>
                  <small>{opt.desc}</small>
                </div>
              </button>
            ))}
          </div>

          <select
            id="leaveType"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            {leaveTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Admin & Approver Selection (Requested Feature) */}
        <div className="form-section-block approver-selection-section">
          <div className="label-with-counter">
            <label className="section-field-label">
              Send Request To (Select Admin / Approver) <span className="req-star">*</span>
            </label>
            <span className="field-hint-text">Choose which admin or manager will review this request</span>
          </div>

          <div className="approver-cards-grid">
            {/* Global option */}
            <button
              type="button"
              className={`approver-card ${assignedAdmin === "All Admins (Default)" ? "selected" : ""}`}
              onClick={() => setAssignedAdmin("All Admins (Default)")}
            >
              <div className="approver-avatar all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="approver-info">
                <strong>All Administrators</strong>
                <small>Any available Admin can review</small>
              </div>
              <span className="approver-badge">GLOBAL</span>
            </button>

            {/* Individual Admins from DB */}
            {displayAdmins.map((adm) => {
              const fullVal = `${adm.name} (${adm.email})`;
              const isSelected = assignedAdmin === fullVal;
              return (
                <button
                  key={adm.id || adm.email}
                  type="button"
                  className={`approver-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setAssignedAdmin(fullVal)}
                >
                  <div className="approver-avatar">
                    {adm.name ? adm.name.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className="approver-info">
                    <strong>{adm.name}</strong>
                    <small>{adm.email}</small>
                  </div>
                  <span className="approver-badge admin">ADMIN</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Date Fields & Duration Preview */}
        <div className="dates-duration-grid">
          <div className="field-box">
            <label htmlFor="fromDate">
              Start Date <span className="req-star">*</span>
            </label>
            <div className="date-input-wrap">
              <input
                id="fromDate"
                type="date"
                min={localToday}
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  if (toDate && event.target.value > toDate) setToDate("");
                }}
                required
              />
            </div>
          </div>

          <div className="field-box">
            <label htmlFor="toDate">
              End Date <span className="req-star">*</span>
            </label>
            <div className="date-input-wrap">
              <input
                id="toDate"
                type="date"
                min={fromDate || localToday}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration Card */}
          <div className="duration-preview-card">
            <div className="duration-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="duration-text-group">
              <span className="duration-sub-label">Total Duration</span>
              <span className="duration-days-count">
                {leaveDays} {leaveDays === 1 ? "Day" : "Days"}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Reason Field */}
        <div className="field-box">
          <div className="label-with-counter">
            <label htmlFor="reason">
              Reason for Absence <span className="req-star">*</span>
            </label>
            <span className="char-counter">{reason.length} / 500 characters</span>
          </div>
          <textarea
            id="reason"
            rows="3"
            maxLength="500"
            placeholder="Please detail your reason for leave (e.g. personal family event, medical appointment)..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className={`apply-alert-banner ${messageType}`} role="status" aria-live="polite">
            <span className="alert-icon-sym">{messageType === "success" ? "✓" : "⚠"}</span>
            <span>{message}</span>
          </div>
        )}

        {/* Card Footer Actions */}
        <div className="card-form-footer">
          <div className="footer-status-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Submissions will appear in your requests table immediately as <strong>PENDING</strong>.</span>
          </div>

          <button className="apply-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="loading-state-flex">
                <span className="btn-spinner"></span>
                Submitting Request...
              </span>
            ) : (
              <>
                <span>Submit Leave Application</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ApplyLeave;
