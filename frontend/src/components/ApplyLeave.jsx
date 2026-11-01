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
      setMessage("Please enter a reason for your leave.");
      return;
    }

    const token = localStorage.getItem("leaveToken");

    if (!token) {
      setMessageType("error");
      setMessage("Please log in again before applying for leave.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveType,
          fromDate,
          toDate,
          reason: reason.trim(),
        }),
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
      setMessage("Leave request submitted successfully!");
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

  return (
    <section className="apply-leave-card">
      <div className="apply-leave-heading">
        <div>
          <p className="apply-leave-eyebrow">LEAVE MANAGEMENT</p>
          <h2>Apply for Leave</h2>
          <p className="apply-leave-subtitle">
            Fill in the details below to submit your leave request.
          </p>
        </div>
        <div className="leave-heading-icon" aria-hidden="true">📅</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="leave-form-grid">
          <div className="leave-field">
            <label htmlFor="leaveType">Leave type</label>
            <select
              id="leaveType"
              value={leaveType}
              onChange={(event) => setLeaveType(event.target.value)}
              required
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="EARNED">Earned Leave</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="leave-field">
            <label htmlFor="fromDate">Start date</label>
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

          <div className="leave-field">
            <label htmlFor="toDate">End date</label>
            <input
              id="toDate"
              type="date"
              min={fromDate || localToday}
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              required
            />
          </div>

          <div className="leave-days-preview">
            <span className="leave-days-icon">⏱️</span>
            <div>
              <span className="leave-days-label">Total leave duration</span>
              <strong>
                {leaveDays} {leaveDays === 1 ? "day" : "days"}
              </strong>
            </div>
          </div>

          <div className="leave-field leave-reason-field">
            <label htmlFor="reason">Reason for leave</label>
            <textarea
              id="reason"
              rows="4"
              maxLength="500"
              placeholder="Please explain why you need leave..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
            <span className="leave-character-count">
              {reason.length}/500 characters
            </span>
          </div>
        </div>

        {message && (
          <div
            className={`leave-message ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <div className="leave-form-footer">
          <p>Your request will be submitted for approval with PENDING status.</p>
          <button
            className="leave-submit-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Leave Request →"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ApplyLeave;
