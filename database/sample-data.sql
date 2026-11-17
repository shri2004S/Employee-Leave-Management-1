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
-- Live Admin 1: email: manideepsir@gmail.com | password: Password@123 (or Shri1234@)
-- Live Admin 2: email: sushilsir@gmail.com   | password: Password@123 (or Shri1234@)
-- Live Admin 3: email: gauravsir@gmail.com   | password: Password@123 (or Shri1234@)
-- Admin User:   email: admin@gmail.com       | password: Shri1234@
-- System Admin: email: admin@settribe.com    | password: Password@123
-- Employee:     email: john@settribe.com     | password: Password@123
-- -------------------------------------------------------
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Manideep Sir', 'manideepsir@gmail.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('Sushil Sir', 'sushilsir@gmail.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('Gaurav Sir', 'gauravsir@gmail.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('Admin User', 'admin@gmail.com', 'Shri1234@', 'ADMIN'),
('New Admin', 'newadmin@gmail.com', 'Shri1234@', 'ADMIN'),
('System Admin', 'admin@settribe.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('John Doe', 'john@settribe.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'EMPLOYEE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);

-- -------------------------------------------------------
-- 2. Insert Sample Leave Requests
-- Dynamically matches John Doe's user_id to prevent foreign key errors
-- -------------------------------------------------------
INSERT INTO `leave_requests` (`user_id`, `leave_type`, `from_date`, `to_date`, `reason`, `status`, `assigned_admin`)
SELECT `id`, 'CASUAL', '2026-11-10', '2026-11-12', 'Attending family wedding ceremony', 'PENDING', 'Manideep Sir (manideepsir@gmail.com)'
FROM `users` WHERE `email` = 'john@settribe.com'
UNION ALL
SELECT `id`, 'SICK', '2026-10-15', '2026-10-16', 'Severe fever and doctor consultation', 'APPROVED', 'Sushil Sir (sushilsir@gmail.com)'
FROM `users` WHERE `email` = 'john@settribe.com'
UNION ALL
SELECT `id`, 'EARNED', '2026-09-01', '2026-09-05', 'Annual personal vacation', 'REJECTED', 'Gaurav Sir (gauravsir@gmail.com)'
FROM `users` WHERE `email` = 'john@settribe.com';
