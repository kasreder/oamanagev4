-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS oamanage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE oamanage;

-- users 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login_method VARCHAR(50) NOT NULL DEFAULT 'kakao',
  kakao_id VARCHAR(100) NOT NULL UNIQUE,
  nickname VARCHAR(100) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  profile_image VARCHAR(500) DEFAULT NULL,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_login_method (login_method),
  INDEX idx_kakao_id (kakao_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
