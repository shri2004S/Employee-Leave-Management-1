import { useEffect, useState, useMemo } from "react";
import "./AdminLeaveManagement.css";

import { ADMIN_API_URL } from "../apiConfig";

function AdminLeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    id: null,
    newStatus: null,
    employeeName: null,
  });

  async function fetchAllLeaves() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("leaveToken");
    const user = localStorage.getItem("leaveUser");

    if (!token && !user) {
      setError("Admin session not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(ADMIN_API_URL, {
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Access Denied: You must be an ADMIN to access this portal."
            : `Failed to load requests (${response.status}).`
        );
      }

      const data = await response.json();
      setLeaves(data);
    } catch (err) {
      setError(err.message || "Failed to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  // Trigger modal confirmation
  function promptStatusUpdate(id, newStatus, employeeName) {
    setConfirmModal({
      show: true,
      id,
      newStatus,
      employeeName: employeeName || "Employee",
    });
  }

  // Execute status update
  async function executeStatusUpdate() {
    const { id, newStatus } = confirmModal;
    if (!id || !newStatus) return;

    setConfirmModal({ show: false, id: null, newStatus: null, employeeName: null });
    setActionLoadingId(id);
    setError("");
    setSuccessMessage("");
    const token = localStorage.getItem("leaveToken");

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${ADMIN_API_URL}/${id}/status`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to update status (${response.status})`);
      }

      setSuccessMessage(data.message || `Leave application #${id} has been ${newStatus}.`);
      fetchAllLeaves();
    } catch (err) {
      setError(err.message || "Failed to update leave request status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Filtered leaves
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
        (leave.employeeName &&
          leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (leave.employeeEmail &&
          leave.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (leave.reason &&
          leave.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (leave.id && String(leave.id).includes(searchTerm.trim()));

      return matchStatus && matchType && matchSearch;
    });
  }, [leaves, statusFilter, typeFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === "PENDING").length,
      approved: leaves.filter((l) => l.status === "APPROVED").length,
      rejected: leaves.filter((l) => l.status === "REJECTED").length,
    };
  }, [leaves]);

  // Helper for duration days
  const getDaysCount = (from, to) => {
    if (!from || !to) return 1;
    const s = new Date(from);
    const e = new Date(to);
    const diff = Math.round((e - s) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return "E";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <section className="admin-management-container">
      {/* 1. Statistics Cards */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card stat-total">
          <div className="metric-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            </svg>
          </div>
          <div className="metric-text-box">
            <span className="metric-tag">TOTAL APPLICATIONS</span>
            <h3 className="metric-number">{stats.total}</h3>
          </div>
        </div>

        <div className="admin-metric-card stat-pending">
          <div className="metric-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="metric-text-box">
            <span className="metric-tag">PENDING APPROVAL</span>
            <h3 className="metric-number">{stats.pending}</h3>
          </div>
        </div>

        <div className="admin-metric-card stat-approved">
          <div className="metric-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="metric-text-box">
            <span className="metric-tag">APPROVED LEAVES</span>
            <h3 className="metric-number">{stats.approved}</h3>
          </div>
        </div>

        <div className="admin-metric-card stat-rejected">
          <div className="metric-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div className="metric-text-box">
            <span className="metric-tag">REJECTED LEAVES</span>
            <h3 className="metric-number">{stats.rejected}</h3>
          </div>
        </div>
      </div>

      {/* 2. Admin Header & Refresh */}
      <div className="admin-section-header">
        <div>
          <span className="admin-eyebrow-pill">ORGANIZATION OVERSIGHT</span>
          <h2>Employee Leave Management</h2>
          <p className="admin-subtitle-desc">
            Review absence requests from employees across your team and take approval actions.
          </p>
        </div>

        <button
          className="admin-sync-btn"
          onClick={fetchAllLeaves}
          disabled={loading}
          title="Fetch latest applications"
        >
          <svg className={loading ? "spin" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          <span>{loading ? "Refreshing..." : "Refresh Applications"}</span>
        </button>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="admin-filter-toolbar">
        <div className="admin-search-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search employee name, email, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-dropdown-group">
          <div className="admin-select-field">
            <label htmlFor="adminStatusFilter">Status:</label>
            <select
              id="adminStatusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All ({stats.total})</option>
              <option value="PENDING">Pending ({stats.pending})</option>
              <option value="APPROVED">Approved ({stats.approved})</option>
              <option value="REJECTED">Rejected ({stats.rejected})</option>
            </select>
          </div>

          <div className="admin-select-field">
            <label htmlFor="adminTypeFilter">Leave Type:</label>
            <select
              id="adminTypeFilter"
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

      {/* 4. Feedback Notifications */}
      {successMessage && (
        <div className="admin-alert-banner success" role="status">
          <span className="banner-icon">✓</span>
          <span>{successMessage}</span>
          <button className="banner-close" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      {error && (
        <div className="admin-alert-banner error" role="alert">
          <span className="banner-icon">⚠</span>
          <span>{error}</span>
          <button className="banner-retry" onClick={fetchAllLeaves}>Retry</button>
        </div>
      )}

      {/* 5. Organization Leave Requests Table */}
      {loading ? (
        <div className="admin-loading-card">
          <div className="admin-spinner"></div>
          <p>Loading employee leave records...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="admin-empty-card">
          <div className="empty-circle-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h3>No Leave Applications Found</h3>
          <p>
            {searchTerm || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "No applications matched your search or filter criteria."
              : "No employee leave applications have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="admin-table-frame">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Duration &amp; Dates</th>
                <th>Reason</th>
                <th>Current Status</th>
                <th className="actions-header-th">Approval Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeaves.map((leave) => {
                const days = getDaysCount(leave.fromDate, leave.toDate);
                const statusLower = String(leave.status).toLowerCase();
                const initials = getInitials(leave.employeeName);
                const isActionLoading = actionLoadingId === leave.id;

                return (
                  <tr key={leave.id}>
                    <td>
                      <span className="admin-id-pill">#{leave.id}</span>
                    </td>

                    <td>
                      <div className="employee-info-cell">
                        <div className="emp-avatar-circle">{initials}</div>
                        <div className="emp-text-details">
                          <strong className="emp-name-text">
                            {leave.employeeName || "Unknown Employee"}
                          </strong>
                          <span className="emp-email-text">
                            {leave.employeeEmail || "No Email Provided"}
                          </span>
                          <span className="emp-assigned-badge" title={`Assigned To: ${leave.assignedAdmin || "All Admins"}`}>
                            To: {leave.assignedAdmin || "All Admins"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`admin-type-badge ${String(leave.leaveType).toLowerCase()}`}>
                        {leave.leaveType}
                      </span>
                    </td>

                    <td>
                      <div className="admin-duration-cell">
                        <span className="admin-days-pill">
                          {days} {days === 1 ? "day" : "days"}
                        </span>
                        <span className="admin-date-range">
                          {leave.fromDate} → {leave.toDate}
                        </span>
                      </div>
                    </td>

                    <td className="admin-reason-cell" title={leave.reason}>
                      {leave.reason}
                    </td>

                    <td>
                      <span className={`admin-status-pill ${statusLower}`}>
                        <span className="admin-dot"></span>
                        {leave.status}
                      </span>
                    </td>

                    <td className="admin-actions-cell">
                      {isActionLoading ? (
                        <div className="admin-action-loading">
                          <span className="action-spinner"></span>
                          <span>Processing...</span>
                        </div>
                      ) : leave.status === "PENDING" ? (
                        <div className="admin-action-btn-pair">
                          <button
                            className="btn-approve"
                            title="Approve this application"
                            onClick={() => promptStatusUpdate(leave.id, "APPROVED", leave.employeeName)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Approve</span>
                          </button>

                          <button
                            className="btn-reject"
                            title="Reject this application"
                            onClick={() => promptStatusUpdate(leave.id, "REJECTED", leave.employeeName)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div className="action-completed-tag">
                          <span className="completed-check">✓</span>
                          <span>{leave.status === "APPROVED" ? "Approved" : "Rejected"}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Admin Decision Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal-screen-backdrop" onClick={() => setConfirmModal({ show: false, id: null, newStatus: null, employeeName: null })}>
          <div className="modal-dialog-panel confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon-box ${confirmModal.newStatus === "APPROVED" ? "success" : "danger"}`}>
              {confirmModal.newStatus === "APPROVED" ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>

            <h3>
              {confirmModal.newStatus === "APPROVED" ? "Approve Leave Request?" : "Reject Leave Request?"}
            </h3>

            <p>
              Are you sure you want to mark leave request <strong>#{confirmModal.id}</strong> for <strong>{confirmModal.employeeName}</strong> as <strong>{confirmModal.newStatus}</strong>?
            </p>

            <div className="confirm-actions-row">
              <button
                type="button"
                className="confirm-back-btn"
                onClick={() => setConfirmModal({ show: false, id: null, newStatus: null, employeeName: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`confirm-decision-btn ${confirmModal.newStatus === "APPROVED" ? "approve-btn" : "reject-btn"}`}
                onClick={executeStatusUpdate}
              >
                Yes, {confirmModal.newStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminLeaveManagement;
