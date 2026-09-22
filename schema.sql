-- ==========================================================
-- Event Management System MySQL 8.0 Schema
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `event_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `event_management`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(80) NOT NULL UNIQUE,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(120) NOT NULL,
    `role` VARCHAR(20) DEFAULT 'student',
    `avatar_url` VARCHAR(255) DEFAULT NULL,
    `interests` VARCHAR(255) DEFAULT 'Coding, AI, Hackathons',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_role` (`role`),
    INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(80) NOT NULL UNIQUE,
    `icon` VARCHAR(50) DEFAULT 'fa-calendar-star',
    `color` VARCHAR(30) DEFAULT '#6366f1',
    `description` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Venues Table
CREATE TABLE IF NOT EXISTS `venues` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `address` VARCHAR(255) DEFAULT NULL,
    `city` VARCHAR(80) DEFAULT 'Tech Campus',
    `capacity` INT DEFAULT 500
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Events Table
CREATE TABLE IF NOT EXISTS `events` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `organizer_id` INT NOT NULL,
    `category_id` INT NOT NULL,
    `venue_id` INT DEFAULT NULL,
    `venue_name` VARCHAR(150) DEFAULT 'Auditorium Hall A',
    `date` DATE NOT NULL,
    `start_time` VARCHAR(20) DEFAULT '10:00 AM',
    `end_time` VARCHAR(20) DEFAULT '05:00 PM',
    `capacity` INT DEFAULT 100,
    `banner_url` VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    `tags` VARCHAR(255) DEFAULT 'Tech, Coding, Innovation',
    `status` VARCHAR(30) DEFAULT 'pending',
    `rejection_reason` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE SET NULL,
    INDEX `idx_event_status` (`status`),
    INDEX `idx_event_date` (`date`),
    INDEX `idx_event_organizer` (`organizer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Registrations Table
CREATE TABLE IF NOT EXISTS `registrations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `event_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `status` VARCHAR(30) DEFAULT 'registered',
    `ticket_code` VARCHAR(64) NOT NULL UNIQUE,
    `registered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `attended_at` TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_reg_status` (`status`),
    INDEX `idx_reg_ticket` (`ticket_code`),
    INDEX `idx_reg_event_user` (`event_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Announcements Table
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `event_id` INT NOT NULL,
    `organizer_id` INT NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_announcement_event` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Feedbacks Table
CREATE TABLE IF NOT EXISTS `feedbacks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `event_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `rating` INT NOT NULL,
    `comment` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_feedback_event` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Seed Default Categories
INSERT INTO `categories` (`name`, `icon`, `color`, `description`)
VALUES
('Hackathons', 'fa-code', '#6366f1', 'Intensive 24-48h coding competitions and builds'),
('Tech Fests', 'fa-microchip', '#06b6d4', 'Annual engineering expos, tech exhibitions & summits'),
('Workshops', 'fa-laptop-code', '#10b981', 'Hands-on practical skill acquisition sessions'),
('Conferences', 'fa-users', '#f59e0b', 'Keynotes, industry roundtables & academic symposiums'),
('Cultural & Arts', 'fa-masks-theater', '#ec4899', 'Music fests, drama, dance & creative showcases'),
('Sports & Esports', 'fa-gamepad', '#8b5cf6', 'Athletics, competitive gaming & tournaments')
ON DUPLICATE KEY UPDATE `name`=`name`;
