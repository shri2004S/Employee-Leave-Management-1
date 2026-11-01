import { useEffect, useState, useMemo } from "react";
import "./AdminLeaveManagement.css";

const ADMIN_API_URL = "http://localhost:8080/api/admin/leaves";

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

  async function fetchAllLeaves() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("leaveToken");

    if (!token) {
      setError("Admin session not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(ADMIN_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  async function handleStatusUpdate(id, newStatus) {
    const confirmAction = window.confirm(
      `Are you sure you want to mark leave request #${id} as ${newStatus}?`
    );
    if (!confirmAction) return;

    setActionLoadingId(id);
    setError("");
    setSuccessMessage("");
    const token = localStorage.getItem("leaveToken");

    try {
      const response = await fetch(`${ADMIN_API_URL}/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to update status (${response.status})`);
      }

      setSuccessMessage(data.message || `Leave #${id} updated to ${newStatus}`);
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
          leave.reason.toLowerCase().includes(searchTerm.toLowerCase()));

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

  return (
    <section className="admin-portal">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">ADMINISTRATOR PORTAL</p>
          <h2>All Employee Leave Requests</h2>
          <p className="admin-subtitle">
            Review, approve, or reject employee leave applications across the organization.
          </p>
        </div>

        <button
          className="admin-refresh-btn"
          onClick={fetchAllLeaves}
          disabled={loading}
        >
          {loading ? "Loading..." : "🔄 Refresh Data"}
        </button>
      </div>

      {/* Admin Stat Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📊</span>
          <p>Total Submissions</p>
          <h3>{stats.total}</h3>
        </div>
        <div className="admin-stat-card stat-pending">
          <span className="admin-stat-icon">⏳</span>
          <p>Pending Review</p>
          <h3>{stats.pending}</h3>
        </div>
        <div className="admin-stat-card stat-approved">
          <span className="admin-stat-icon">✅</span>
          <p>Approved</p>
          <h3>{stats.approved}</h3>
        </div>
        <div className="admin-stat-card stat-rejected">
          <span className="admin-stat-icon">❌</span>
          <p>Rejected</p>
          <h3>{stats.rejected}</h3>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-filters-bar">
        <div className="admin-filter-group">
          <label htmlFor="searchEmployee">Search Employee / Reason:</label>
          <input
            id="searchEmployee"
            type="text"
            placeholder="Search name, email, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-filter-group">
          <label htmlFor="adminStatusFilter">Filter by Status:</label>
          <select
            id="adminStatusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({stats.total})</option>
            <option value="PENDING">Pending Only ({stats.pending})</option>
            <option value="APPROVED">Approved Only ({stats.approved})</option>
            <option value="REJECTED">Rejected Only ({stats.rejected})</option>
          </select>
        </div>

        <div className="admin-filter-group">
          <label htmlFor="adminTypeFilter">Filter by Type:</label>
          <select
            id="adminTypeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Leave Types</option>
            <option value="CASUAL">Casual Leave</option>
            <option value="SICK">Sick Leave</option>
            <option value="EARNED">Earned Leave</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="admin-banner success-banner" role="status">
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div className="admin-banner error-banner" role="alert">
          ❌ {error}
        </div>
      )}

      {/* Table */}
      {loading && <p className="admin-info">Loading leave records...</p>}

      {!loading && filteredLeaves.length === 0 && (
        <div className="admin-empty">
          <span>📋</span>
          <h3>No matching leave requests</h3>
          <p>Try resetting the status or type filter.</p>
        </div>
      )}

      {!loading && filteredLeaves.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <strong>#{leave.id}</strong>
                  </td>
                  <td>
                    <div className="emp-info">
                      <span className="emp-name">{leave.employeeName}</span>
                      <span className="emp-email">{leave.employeeEmail}</span>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">{leave.leaveType}</span>
                  </td>
                  <td>
                    <div className="date-info">
                      <span><strong>From:</strong> {leave.fromDate}</span>
                      <span><strong>To:</strong> {leave.toDate}</span>
                    </div>
                  </td>
                  <td className="reason-cell">{leave.reason}</td>
                  <td>
                    <span
                      className={`leave-status ${String(
                        leave.status
                      ).toLowerCase()}`}
                    >
                      {leave.status}
                    </span>
                  </td>
                  <td>
                    {leave.status === "PENDING" ? (
                      <div className="action-buttons">
                        <button
                          className="approve-btn"
                          disabled={actionLoadingId === leave.id}
                          onClick={() => handleStatusUpdate(leave.id, "APPROVED")}
                        >
                          {actionLoadingId === leave.id ? "..." : "✓ Approve"}
                        </button>
                        <button
                          className="reject-btn"
                          disabled={actionLoadingId === leave.id}
                          onClick={() => handleStatusUpdate(leave.id, "REJECTED")}
                        >
                          {actionLoadingId === leave.id ? "..." : "✗ Reject"}
                        </button>
                      </div>
                    ) : (
                      <span className="action-completed">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminLeaveManagement;

