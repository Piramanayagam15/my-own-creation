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

-- Optional: Sample initial bookings and verified reviews for testing
INSERT INTO bookings (name, phone, email, preferred_date, service, message, status, created_at)
VALUES 
  ('Priya Raman', '+91 98765 43210', 'priya.raman@example.com', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Bridal Makeup', 'Looking for HD Airbrush makeup for Muhurtham & Reception in Chennai.', 'pending', NOW()),
  ('Ananya Sundaram', '+91 94432 10987', 'ananya.s@example.com', DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Mehndi (Henna)', 'Bridal peacock pattern henna for hands and feet.', 'contacted', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  ('Deepika Natarajan', '+91 97890 12345', 'deepika.n@example.com', DATE_ADD(CURDATE(), INTERVAL 40 DAY), 'Aari Embroidery', 'Custom gold zari zardozi bridal blouse embroidery.', 'confirmed', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO reviews (name, city, rating, service, comment, author_token, status, created_at)
VALUES
  ('Keerthana Rajesh', 'Chennai', 5, '💄 Muhurtham Bridal Makeup', 'AK Bridals made my wedding day truly magical! The HD airbrush makeup stayed completely fresh, sweat-proof, and glowing from 5 AM Muhurtham until the evening rituals.', 'auth_keerthana_201', 'approved', NOW()),
  ('Soundarya Manoharan', 'Madurai', 5, '🌿 Bridal Organic Mehndi', 'The organic henna was breathtaking! The bridal peacock and temple motifs were so sharp and intricate. The color developed into an intense dark maroon stain that lasted over two weeks.', 'auth_soundarya_202', 'approved', NOW()),
  ('Divya Venkatesh', 'Coimbatore', 5, '🪡 Handcrafted Aari Silk Blouse', 'Superb zardozi needlework and gold zari detailing on my wedding saree blouse. The precision tailoring fit was 100% flawless and perfectly matched my antique bridal jewelry.', 'auth_divya_203', 'approved', NOW()),
  ('Sangeetha Ramesh', 'Tirunelveli', 5, '💇‍♀️ Hair Styling & Saree Draping', 'The traditional poola jada floral setting and box-pleated Kanchipuram silk saree draping was immaculate. It stayed perfectly in place through all wedding rituals with zero discomfort.', 'auth_sangeetha_204', 'approved', NOW()),
  ('Aarthi Subramanian', 'Bengaluru', 5, '👑 Royal Muhurtham & Reception Combo', 'Booked AK Bridals for both my Muhurtham and Reception. Loved how they gave two completely distinct looks — pure traditional muhurtham bride for morning and glamorous dewy glow for night!', 'auth_aarthi_205', 'approved', NOW()),
  ('Janani Vijay', 'Trichy', 4, '🎓 Professional Academy Course', 'Attended the bridal masterclass. Excellent practical training with live models and clear product guidance. Gave me immense confidence to take on bridal makeup bookings independently.', 'auth_janani_206', 'approved', NOW())
ON DUPLICATE KEY UPDATE id=id;

