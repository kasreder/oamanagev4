-- 애플리케이션이 자동으로 실행하는 초기화 로직(Database.initializeDatabase)과 동일하게
-- 수동으로 DB를 만들 때 사용할 수 있는 스키마입니다.
CREATE DATABASE IF NOT EXISTS oa_asset_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE oa_asset_manager;

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
