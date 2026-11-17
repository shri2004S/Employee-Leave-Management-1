-- =======================================================
-- Database: settribe_leave_db
-- Sample Data for Initial Setup & Testing
-- =======================================================

USE `settribe_leave_db`;

-- -------------------------------------------------------
-- 1. Insert Initial Users
-- Passwords are encrypted using BCrypt (strength 10)
-- 
-- Universal test credentials (ONLY 3 Project Admins + 1 Employee):
-- Admin 1:  email: manideep@gmail.com  | password: Password@123 (or Shri1234@)
-- Admin 2:  email: sushil@gmail.com    | password: Password@123 (or Shri1234@)
-- Admin 3:  email: gaurav@gmail.com    | password: Password@123 (or Shri1234@)
-- Employee: email: john@settribe.com   | password: Password@123
-- -------------------------------------------------------
-- Remove legacy test accounts
DELETE FROM `users` WHERE `email` IN ('manideepsir@gmail.com', 'sushilsir@gmail.com', 'gauravsir@gmail.com', 'admin@settribe.com', 'admin@gmail.com', 'newadmin@gmail.com');

INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Manideep Sir', 'manideep@gmail.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('Sushil Sir', 'sushil@gmail.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('Gaurav Sir', 'gaurav@gmail.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'ADMIN'),
('John Doe', 'john@settribe.com', '$2a$10$baN/1DaM95ALzvOHcy6FPeXLvk.sZXXHwciSnSNAaeOfi666iaGI6', 'EMPLOYEE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);

-- -------------------------------------------------------
-- 2. Insert Sample Leave Requests
-- Dynamically matches John Doe's user_id to prevent foreign key errors
-- -------------------------------------------------------
INSERT INTO `leave_requests` (`user_id`, `leave_type`, `from_date`, `to_date`, `reason`, `status`, `assigned_admin`)
SELECT `id`, 'CASUAL', '2026-11-10', '2026-11-12', 'Attending family wedding ceremony', 'PENDING', 'Manideep Sir (manideep@gmail.com)'
FROM `users` WHERE `email` = 'john@settribe.com'
UNION ALL
SELECT `id`, 'SICK', '2026-10-15', '2026-10-16', 'Severe fever and doctor consultation', 'APPROVED', 'Sushil Sir (sushil@gmail.com)'
FROM `users` WHERE `email` = 'john@settribe.com'
UNION ALL
SELECT `id`, 'EARNED', '2026-09-01', '2026-09-05', 'Annual personal vacation', 'REJECTED', 'Gaurav Sir (gaurav@gmail.com)'
FROM `users` WHERE `email` = 'john@settribe.com';
