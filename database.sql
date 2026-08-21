-- ========================================================
-- AK BRIDALS PRODUCTION DATABASE SCHEMA
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB
-- ========================================================

CREATE DATABASE IF NOT EXISTS ak_bridals;
USE ak_bridals;

-- 1. Bookings Table (Manages Bride Appointments & Inquiries)
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(64) PRIMARY KEY,
  booking_ref VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  preferred_date DATE NOT NULL,
  event_type VARCHAR(100) DEFAULT 'Wedding',
  service VARCHAR(150) NOT NULL,
  location VARCHAR(255) DEFAULT '',
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, confirmed, cancelled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_ref (booking_ref),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_date (preferred_date),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Reviews Table (Customer Feedback & Moderation Queue)
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) DEFAULT 'Tamil Nadu',
  rating INT NOT NULL DEFAULT 5,
  service VARCHAR(150) NOT NULL,
  comment TEXT NOT NULL,
  author_token VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, approved, rejected',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_author (author_token),
  INDEX idx_rating (rating),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Gallery Media Table (Photos & Video Reels)
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL COMMENT 'bridal-makeup, mehndi, aari, hair, before-after, video',
  type VARCHAR(20) DEFAULT 'image' COMMENT 'image, video',
  src LONGTEXT,
  embed_url TEXT,
  thumbnail LONGTEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Services & Packages Table
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  service_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(32) DEFAULT '💄',
  starting_price DECIMAL(10, 2) DEFAULT 0.00,
  price_display VARCHAR(100),
  tag VARCHAR(100) DEFAULT 'Popular',
  description TEXT,
  inclusions TEXT COMMENT 'JSON array or comma-separated list of inclusions',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_key (service_key),
  INDEX idx_price (starting_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Blocked Dates Table (Wedding Availability Calendar)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blocked_date DATE NOT NULL UNIQUE,
  reason VARCHAR(255) DEFAULT 'Fully Booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blocked_date (blocked_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Studio Settings Table (Key-Value Business Configuration)
CREATE TABLE IF NOT EXISTS studio_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Admin Sessions & Security Log
CREATE TABLE IF NOT EXISTS admin_sessions (
  token VARCHAR(128) PRIMARY KEY,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Default Studio Settings
INSERT INTO studio_settings (setting_key, setting_value) VALUES
  ('studio_name', 'AK Bridals'),
  ('owner_name', 'AK Bridal Artistry'),
  ('phone', '+91 8190913110'),
  ('whatsapp', '918190913110'),
  ('email', '1508apiramanayagam@gmail.com'),
  ('location', 'Tamil Nadu & Destination Weddings'),
  ('instagram', 'https://instagram.com/'),
  ('about_bio', 'At AK Bridals, we specialize in bridal makeovers, organic mehndi, handcrafted aari embroidery, and saree pleating.'),
  ('pin', 'akbridals2026')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
