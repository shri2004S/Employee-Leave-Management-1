-- =======================================================
-- Database: settribe_leave_db
-- Sample Data for Initial Setup & Testing
-- =======================================================

USE `settribe_leave_db`;

-- -------------------------------------------------------
-- 1. Insert Initial Users
-- Passwords are encrypted using BCrypt (strength 10)
-- 
-- Universal test credentials:
-- Admin:    email: admin@settribe.com | password: Password@123
-- Employee: email: john@settribe.com  | password: Password@123
-- -------------------------------------------------------
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Admin User', 'admin@settribe.com', '$2a$10$euE3BzRF2F1jJQYNjearkOn1/ssFRvgrnvPQWMIXwP4Hqrfxpg6.W', 'ADMIN'),
('John Doe', 'john@settribe.com', '$2a$10$euE3BzRF2F1jJQYNjearkOn1/ssFRvgrnvPQWMIXwP4Hqrfxpg6.W', 'EMPLOYEE');

-- -------------------------------------------------------
-- 2. Insert Sample Leave Requests for John Doe (user_id = 2)
-- -------------------------------------------------------
INSERT INTO `leave_requests` (`user_id`, `leave_type`, `from_date`, `to_date`, `reason`, `status`) VALUES
(2, 'CASUAL', '2026-11-10', '2026-11-12', 'Attending family wedding ceremony', 'PENDING'),
(2, 'SICK', '2026-10-15', '2026-10-16', 'Severe fever and doctor consultation', 'APPROVED'),
(2, 'EARNED', '2026-09-01', '2026-09-05', 'Annual personal vacation', 'REJECTED');
