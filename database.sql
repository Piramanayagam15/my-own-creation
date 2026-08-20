-- AK Bridals Database Schema
-- Run this SQL script to create the database and table

-- Create database
CREATE DATABASE IF NOT EXISTS ak_bridals;
USE ak_bridals;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  preferred_date DATE NOT NULL,
  service VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, contacted, confirmed, cancelled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_date (preferred_date),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create reviews table (Supports admin and author-only authorization)
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) DEFAULT '',
  rating INT NOT NULL DEFAULT 5,
  service VARCHAR(150) NOT NULL,
  comment TEXT NOT NULL,
  author_token VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'approved' COMMENT 'approved, pending, hidden',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_author (author_token),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Sample initial bookings for testing
INSERT INTO bookings (name, phone, email, preferred_date, service, message, status, created_at)
VALUES 
  ('Priya Raman', '+91 98765 43210', 'priya.raman@example.com', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Bridal Makeup', 'Looking for HD Airbrush makeup for Muhurtham & Reception in Chennai.', 'pending', NOW()),
  ('Ananya Sundaram', '+91 94432 10987', 'ananya.s@example.com', DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Mehndi (Henna)', 'Bridal peacock pattern henna for hands and feet.', 'contacted', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  ('Deepika Natarajan', '+91 97890 12345', 'deepika.n@example.com', DATE_ADD(CURDATE(), INTERVAL 40 DAY), 'Aari Embroidery', 'Custom gold zari zardozi bridal blouse embroidery.', 'confirmed', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE id=id;

