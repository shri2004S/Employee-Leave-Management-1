import { useMemo, useState } from "react";
import "./ApplyLeave.css";

const API_URL = "http://localhost:8080/api/leaves";

function ApplyLeave({ onLeaveSubmitted }) {
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

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
      setMessage("Leave request submitted successfully! Your application is now PENDING review.");
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
    { value: "CASUAL", label: "Casual Leave", icon: "🌴", desc: "Short personal time off" },
    { value: "SICK", label: "Sick Leave", icon: "🏥", desc: "Medical or health recovery" },
    { value: "EARNED", label: "Earned Leave", icon: "⭐", desc: "Annual accrued vacation" },
    { value: "OTHER", label: "Other / Special", icon: "📌", desc: "Special circumstances" },
  ];

  return (
    <section className="apply-leave-card-panel">
      {/* Card Header */}
      <div className="card-top-header">
        <div className="header-text-block">
          <span className="card-eyebrow-pill">REQUEST ABSENCE</span>
          <h2>Apply for Leave</h2>
          <p className="card-subtitle-desc">
            Complete the form below to request time off. Your manager will be notified for review.
          </p>
        </div>

        <div className="card-icon-badge" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="apply-form-container">
        {/* Leave Type Selector with Interactive Cards */}
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
                <span className="type-pill-emoji">{opt.icon}</span>
                <div className="type-pill-text">
                  <strong>{opt.label}</strong>
                  <small>{opt.desc}</small>
                </div>
              </button>
            ))}
          </div>

          {/* Accessible hidden select for screen readers / fallbacks */}
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

        {/* Date Fields & Duration Preview */}
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

        {/* Reason Field */}
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
