-- =======================================================
-- Database: settribe_leave_db
-- Useful SQL Queries for Employee Leave Management System
-- (Frequently asked in Java Full Stack Technical Interviews!)
-- =======================================================

USE `settribe_leave_db`;

-- -------------------------------------------------------
-- Query 1: Find all users registered in the system
-- -------------------------------------------------------
SELECT id, name, email, role, created_at 
FROM users 
ORDER BY id DESC;

-- -------------------------------------------------------
-- Query 2: Find all leave requests with employee details (JOIN query)
-- -------------------------------------------------------
SELECT 
    lr.id AS leave_id,
    u.name AS employee_name,
    u.email AS employee_email,
    lr.leave_type,
    lr.from_date,
    lr.to_date,
    DATEDIFF(lr.to_date, lr.from_date) + 1 AS total_days,
    lr.reason,
    lr.status,
    lr.created_at
FROM leave_requests lr
INNER JOIN users u ON lr.user_id = u.id
ORDER BY lr.created_at DESC;

-- -------------------------------------------------------
-- Query 3: Find leaves by specific employee ID (e.g. employee 2)
-- -------------------------------------------------------
SELECT id, leave_type, from_date, to_date, reason, status, created_at
FROM leave_requests
WHERE user_id = 2
ORDER BY created_at DESC;

-- -------------------------------------------------------
-- Query 4: Find all pending leave requests (for Admin Dashboard)
-- -------------------------------------------------------
SELECT 
    lr.id,
    u.name AS employee_name,
    lr.leave_type,
    lr.from_date,
    lr.to_date,
    lr.reason,
    lr.status
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
WHERE lr.status = 'PENDING'
ORDER BY lr.from_date ASC;

-- -------------------------------------------------------
-- Query 5: Dashboard statistics count (Total, Pending, Approved, Rejected)
-- -------------------------------------------------------
SELECT 
    COUNT(*) AS total_requests,
    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count
FROM leave_requests;

-- -------------------------------------------------------
-- Query 6: Approve a leave request (Admin Action)
-- -------------------------------------------------------
UPDATE leave_requests 
SET status = 'APPROVED' 
WHERE id = 1;

-- -------------------------------------------------------
-- Query 7: Reject a leave request (Admin Action)
-- -------------------------------------------------------
UPDATE leave_requests 
SET status = 'REJECTED' 
WHERE id = 1;

-- -------------------------------------------------------
-- Query 8: Edit a pending leave request (Employee Action)
-- -------------------------------------------------------
UPDATE leave_requests
SET leave_type = 'SICK',
    from_date = '2026-11-15',
    to_date = '2026-11-16',
    reason = 'Updated reason for medical leave'
WHERE id = 1 AND status = 'PENDING' AND user_id = 2;

-- -------------------------------------------------------
-- Query 9: Cancel / Delete a pending leave request (Employee Action)
-- -------------------------------------------------------
DELETE FROM leave_requests 
WHERE id = 1 AND status = 'PENDING' AND user_id = 2;

