import { useEffect, useState, useMemo } from "react";
import "./MyLeaveRequests.css";

const API_URL = "http://localhost:8080/api/leaves";

function MyLeaveRequests({ refreshTrigger }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Modal State
  const [editingLeave, setEditingLeave] = useState(null);
  const [editLeaveType, setEditLeaveType] = useState("CASUAL");
  const [editFromDate, setEditFromDate] = useState("");
  const [editToDate, setEditToDate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Cancel Confirmation Modal State
  const [cancelModal, setCancelModal] = useState({ show: false, leaveId: null });

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  async function fetchLeaves() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("leaveToken");

    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(API_URL, {
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Session expired. Please log in again."
            : `Unable to load requests (${response.status}).`
        );
      }

      const data = await response.json();
      setLeaves(data);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
  }, [refreshTrigger]);

  // Statistics calculation for Employee
  const stats = useMemo(() => {
    return {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === "PENDING").length,
      approved: leaves.filter((l) => l.status === "APPROVED").length,
      rejected: leaves.filter((l) => l.status === "REJECTED").length,
    };
  }, [leaves]);

  // Open Edit Modal
  function openEditModal(leave) {
    setEditingLeave(leave);
    setEditLeaveType(leave.leaveType);
    setEditFromDate(leave.fromDate);
    setEditToDate(leave.toDate);
    setEditReason(leave.reason);
    setEditError("");
  }

  function closeEditModal() {
    setEditingLeave(null);
    setEditError("");
  }

  // Submit Edit
  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditError("");

    if (editFromDate < localToday) {
      setEditError("Start date cannot be in the past.");
      return;
    }

    if (editToDate < editFromDate) {
      setEditError("End date cannot be before start date.");
      return;
    }

    if (!editReason.trim()) {
      setEditError("Reason is required.");
      return;
    }

    setEditLoading(true);
    const token = localStorage.getItem("leaveToken");

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/${editingLeave.id}`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          leaveType: editLeaveType,
          fromDate: editFromDate,
          toDate: editToDate,
          reason: editReason.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to update leave request (${response.status})`);
      }

      setSuccessMessage(`Leave request #${editingLeave.id} has been successfully updated!`);
      closeEditModal();
      fetchLeaves();
    } catch (err) {
      setEditError(err.message || "Could not update leave request.");
    } finally {
      setEditLoading(false);
    }
  }

  // Trigger Cancel Dialog
  function promptCancelLeave(id) {
    setCancelModal({ show: true, leaveId: id });
  }

  // Confirm Cancel / Delete leave
  async function confirmCancelLeave() {
    const id = cancelModal.leaveId;
    if (!id) return;

    setCancelModal({ show: false, leaveId: null });
    setError("");
    setSuccessMessage("");
    const token = localStorage.getItem("leaveToken");

    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to cancel leave request (${response.status})`);
      }

      setSuccessMessage(`Leave request #${id} has been cancelled successfully.`);
      fetchLeaves();
    } catch (err) {
      setError(err.message || "Failed to cancel leave request.");
    }
  }

  // Filter leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const matchStatus =
        statusFilter === "ALL" ||
        leave.status.toUpperCase() === statusFilter.toUpperCase();

      const matchType =
        typeFilter === "ALL" ||
        leave.leaveType.toUpperCase() === typeFilter.toUpperCase();

      const matchSearch =
        !searchTerm.trim() ||
        (leave.reason && leave.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (leave.id && String(leave.id).includes(searchTerm.trim()));

      return matchStatus && matchType && matchSearch;
    });
  }, [leaves, statusFilter, typeFilter, searchTerm]);

  // Helper for duration days
  const getDaysCount = (from, to) => {
    if (!from || !to) return 1;
    const s = new Date(from);
    const e = new Date(to);
    const diff = Math.round((e - s) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  };

  return (
    <section className="my-leaves-container-card">
      {/* 1. Statistics Cards for Employee */}
      <div className="employee-stats-grid">
        <div className="stat-metric-card total-stat">
          <div className="stat-metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="stat-metric-data">
            <span className="stat-metric-label">Total Requests</span>
            <h3 className="stat-metric-value">{stats.total}</h3>
          </div>
        </div>

        <div className="stat-metric-card pending-stat">
          <div className="stat-metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-metric-data">
            <span className="stat-metric-label">Pending Review</span>
            <h3 className="stat-metric-value">{stats.pending}</h3>
          </div>
        </div>

        <div className="stat-metric-card approved-stat">
          <div className="stat-metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-metric-data">
            <span className="stat-metric-label">Approved</span>
            <h3 className="stat-metric-value">{stats.approved}</h3>
          </div>
        </div>

        <div className="stat-metric-card rejected-stat">
          <div className="stat-metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div className="stat-metric-data">
            <span className="stat-metric-label">Rejected</span>
            <h3 className="stat-metric-value">{stats.rejected}</h3>
          </div>
        </div>
      </div>

      {/* 2. Table Section Header */}
      <div className="my-leaves-header-bar">
        <div>
          <span className="table-eyebrow-pill">HISTORY &amp; TRACKING</span>
          <h2>My Leave Requests</h2>
          <p className="table-subtitle-desc">
            Monitor the status of your past and active leave submissions.
          </p>
        </div>

        <button
          className="refresh-sync-btn"
          onClick={fetchLeaves}
          disabled={loading}
          title="Reload latest request data"
        >
          <svg className={loading ? "spin" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          <span>{loading ? "Syncing..." : "Refresh Requests"}</span>
        </button>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="table-filters-toolbar">
        <div className="search-input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by reason or request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-dropdown-pair">
          <div className="filter-select-group">
            <label htmlFor="filterStatus">Status:</label>
            <select
              id="filterStatus"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All ({stats.total})</option>
              <option value="PENDING">Pending ({stats.pending})</option>
              <option value="APPROVED">Approved ({stats.approved})</option>
              <option value="REJECTED">Rejected ({stats.rejected})</option>
            </select>
          </div>

          <div className="filter-select-group">
            <label htmlFor="filterType">Type:</label>
            <select
              id="filterType"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="CASUAL">Casual</option>
              <option value="SICK">Sick</option>
              <option value="EARNED">Earned</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Alerts & Notifications */}
      {successMessage && (
        <div className="feedback-banner success" role="status">
          <span className="banner-icon">✓</span>
          <span>{successMessage}</span>
          <button className="banner-close" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      {error && (
        <div className="feedback-banner error" role="alert">
          <span className="banner-icon">⚠</span>
          <span>{error}</span>
          <button className="banner-retry-btn" onClick={fetchLeaves}>Retry</button>
        </div>
      )}

      {/* 5. Leave Requests Table */}
      {loading ? (
        <div className="table-loading-skeleton">
          <div className="skeleton-spinner"></div>
          <p>Retrieving your leave history...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="table-empty-box">
          <div className="empty-icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
          </div>
          <h3>No Leave Applications Found</h3>
          <p>
            {searchTerm || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "No requests match your current filters. Try resetting the filters."
              : "You haven't submitted any leave requests yet. Use the form above to apply."}
          </p>
        </div>
      ) : (
        <div className="table-scroll-frame">
          <table className="modern-data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Category</th>
                <th>Duration &amp; Dates</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="actions-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => {
                const days = getDaysCount(leave.fromDate, leave.toDate);
                const statusLower = String(leave.status).toLowerCase();

                return (
                  <tr key={leave.id}>
                    <td>
                      <span className="id-badge-pill">#{leave.id}</span>
                    </td>

                    <td>
                      <span className={`type-badge-pill ${String(leave.leaveType).toLowerCase()}`}>
                        {leave.leaveType}
                      </span>
                    </td>

                    <td>
                      <div className="date-range-cell">
                        <span className="days-counter-pill">
                          {days} {days === 1 ? "day" : "days"}
                        </span>
                        <span className="date-bounds">
                          {leave.fromDate} → {leave.toDate}
                        </span>
                      </div>
                    </td>

                    <td className="reason-summary-cell" title={leave.reason}>
                      {leave.reason}
                    </td>

                    <td>
                      <span className={`status-pill-badge ${statusLower}`}>
                        <span className="status-indicator-dot"></span>
                        {leave.status}
                      </span>
                    </td>

                    <td className="actions-cell">
                      {leave.status === "PENDING" ? (
                        <div className="table-action-button-group">
                          <button
                            className="btn-action-edit"
                            title="Edit this request"
                            onClick={() => openEditModal(leave)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Edit</span>
                          </button>

                          <button
                            className="btn-action-cancel"
                            title="Cancel this request"
                            onClick={() => promptCancelLeave(leave.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <span className="status-locked-pill" title="Decision has been finalized">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          <span>Locked</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Professional Edit Modal */}
      {editingLeave && (
        <div className="modal-screen-backdrop" onClick={closeEditModal}>
          <div className="modal-dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-panel-header">
              <div className="modal-title-wrap">
                <span className="modal-eyebrow">UPDATE APPLICATION</span>
                <h3>Edit Leave Request #{editingLeave.id}</h3>
              </div>
              <button className="modal-close-icon-btn" onClick={closeEditModal}>×</button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-body-form">
              {editError && (
                <div className="feedback-banner error" role="alert">
                  <span>⚠ {editError}</span>
                </div>
              )}

              <div className="modal-field-group">
                <label htmlFor="editLeaveType">Leave Category</label>
                <select
                  id="editLeaveType"
                  value={editLeaveType}
                  onChange={(e) => setEditLeaveType(e.target.value)}
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="modal-dates-row">
                <div className="modal-field-group">
                  <label htmlFor="editFromDate">Start Date</label>
                  <input
                    id="editFromDate"
                    type="date"
                    min={localToday}
                    value={editFromDate}
                    onChange={(e) => {
                      setEditFromDate(e.target.value);
                      if (editToDate && e.target.value > editToDate) setEditToDate("");
                    }}
                    required
                  />
                </div>

                <div className="modal-field-group">
                  <label htmlFor="editToDate">End Date</label>
                  <input
                    id="editToDate"
                    type="date"
                    min={editFromDate || localToday}
                    value={editToDate}
                    onChange={(e) => setEditToDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-field-group">
                <label htmlFor="editReason">Reason</label>
                <textarea
                  id="editReason"
                  rows="3"
                  maxLength="500"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer-bar">
                <button
                  type="button"
                  className="modal-secondary-cancel-btn"
                  onClick={closeEditModal}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-primary-save-btn"
                  disabled={editLoading}
                >
                  {editLoading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Professional Cancel Confirmation Modal */}
      {cancelModal.show && (
        <div className="modal-screen-backdrop" onClick={() => setCancelModal({ show: false, leaveId: null })}>
          <div className="modal-dialog-panel confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box danger">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3>Cancel Leave Request?</h3>
            <p>
              Are you sure you want to cancel request <strong>#{cancelModal.leaveId}</strong>? This application will be permanently removed.
            </p>
            <div className="confirm-actions-row">
              <button
                type="button"
                className="confirm-back-btn"
                onClick={() => setCancelModal({ show: false, leaveId: null })}
              >
                No, Keep Request
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={confirmCancelLeave}
              >
                Yes, Cancel Application
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MyLeaveRequests;
