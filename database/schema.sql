-- =======================================================
-- Database: settribe_leave_db
-- Employee Leave Management System - Schema Definition
-- =======================================================

CREATE DATABASE IF NOT EXISTS `settribe_leave_db`;
USE `settribe_leave_db`;

-- -------------------------------------------------------
-- Table 1: users
-- Stores all registered employees and system administrators
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table 2: leave_requests
-- Stores employee leave requests with status & dates
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_requests` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `leave_type` VARCHAR(50) NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_leave_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Performance Indexes
-- Improves query speed for filtering by status and user
-- -------------------------------------------------------
CREATE INDEX `idx_leave_user_id` ON `leave_requests` (`user_id`);
CREATE INDEX `idx_leave_status` ON `leave_requests` (`status`);

