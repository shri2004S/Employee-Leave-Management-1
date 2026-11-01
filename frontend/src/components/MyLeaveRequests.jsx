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

  // Edit Modal State
  const [editingLeave, setEditingLeave] = useState(null);
  const [editLeaveType, setEditLeaveType] = useState("CASUAL");
  const [editFromDate, setEditFromDate] = useState("");
  const [editToDate, setEditToDate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

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

    if (!token) {
      setError("Please log in to view your leave requests.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

    const token = localStorage.getItem("leaveToken");
    setEditLoading(true);

    try {
      const response = await fetch(`${API_URL}/${editingLeave.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

      setSuccessMessage(`Leave request #${editingLeave.id} updated successfully!`);
      closeEditModal();
      fetchLeaves();
    } catch (err) {
      setEditError(err.message || "Could not update leave request.");
    } finally {
      setEditLoading(false);
    }
  }

  // Cancel / Delete leave
  async function handleCancelLeave(id) {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel leave request #${id}? This action cannot be undone.`
    );
    if (!confirmCancel) return;

    setError("");
    setSuccessMessage("");
    const token = localStorage.getItem("leaveToken");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to cancel leave request (${response.status})`);
      }

      setSuccessMessage(`Leave request #${id} cancelled successfully.`);
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

      return matchStatus && matchType;
    });
  }, [leaves, statusFilter, typeFilter]);

  return (
    <section className="my-leaves">
      <div className="my-leaves-heading">
        <div>
          <p className="my-leaves-eyebrow">EMPLOYEE PORTAL</p>
          <h2>My Leave Requests</h2>
          <p>View your submitted leave applications, edit details, or cancel pending requests.</p>
        </div>

        <button
          className="refresh-leaves"
          onClick={fetchLeaves}
          disabled={loading}
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="leaves-filter-bar">
        <div className="filter-item">
          <label htmlFor="filterStatus">Status:</label>
          <select
            id="filterStatus"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filterType">Leave Type:</label>
          <select
            id="filterType"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="CASUAL">Casual</option>
            <option value="SICK">Sick</option>
            <option value="EARNED">Earned</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="leaves-success-banner" role="status">
          ✅ {successMessage}
        </div>
      )}

      {loading && <p className="leaves-info">Loading your requests...</p>}

      {!loading && error && (
        <div className="leaves-error" role="alert">
          ❌ {error}
          <button onClick={fetchLeaves}>Try again</button>
        </div>
      )}

      {!loading && !error && filteredLeaves.length === 0 && (
        <div className="leaves-empty">
          <span>📋</span>
          <h3>No matching leave requests</h3>
          <p>No records found matching your selected filters.</p>
        </div>
      )}

      {!loading && !error && filteredLeaves.length > 0 && (
        <div className="leaves-table-wrapper">
          <table className="leaves-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <strong>#{leave.id}</strong>
                  </td>
                  <td>
                    <span className="type-badge">{leave.leaveType}</span>
                  </td>
                  <td>{leave.fromDate}</td>
                  <td>{leave.toDate}</td>
                  <td className="reason-text">{leave.reason}</td>
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
                      <div className="row-actions">
                        <button
                          className="edit-action-btn"
                          title="Edit Request"
                          onClick={() => openEditModal(leave)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="cancel-action-btn"
                          title="Cancel Request"
                          onClick={() => handleCancelLeave(leave.id)}
                        >
                          🗑️ Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="locked-action" title="Processed leaves cannot be modified">
                        🔒 Locked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingLeave && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Leave Request #{editingLeave.id}</h3>
              <button className="modal-close" onClick={closeEditModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && (
                  <div className="modal-error" role="alert">
                    ❌ {editError}
                  </div>
                )}

                <div className="modal-field">
                  <label htmlFor="editLeaveType">Leave Type</label>
                  <select
                    id="editLeaveType"
                    value={editLeaveType}
                    onChange={(e) => setEditLeaveType(e.target.value)}
                    required
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="EARNED">Earned Leave</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="modal-row">
                  <div className="modal-field">
                    <label htmlFor="editFromDate">Start Date</label>
                    <input
                      id="editFromDate"
                      type="date"
                      min={localToday}
                      value={editFromDate}
                      onChange={(e) => setEditFromDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="modal-field">
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

                <div className="modal-field">
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
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-save-btn"
                  disabled={editLoading}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MyLeaveRequests;
