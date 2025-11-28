-- =================================================================================
-- 기존 데이터베이스 초기화
-- =================================================================================

-- SET FOREIGN_KEY_CHECKS = 0;

-- DROP TABLE IF EXISTS Words;
-- DROP TABLE IF EXISTS WordSets;
-- DROP TABLE IF EXISTS Inquiries;
-- DROP TABLE IF EXISTS FAQs;
-- DROP TABLE IF EXISTS Announcements;
-- DROP TABLE IF EXISTS Diaries;
-- DROP TABLE IF EXISTS Todos;
-- DROP TABLE IF EXISTS StudyLogs;
-- DROP TABLE IF EXISTS Characters;
-- DROP TABLE IF EXISTS Users;

-- SET FOREIGN_KEY_CHECKS = 1;users

-- 데이터베이스 생성 / 선택
CREATE DATABASE IF NOT EXISTS godsaeng_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE godsaeng_db;

-- =================================================================================
-- 1. Users (사용자 테이블)
-- =================================================================================
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '사용자 고유 식별자',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '로그인 시 사용할 이메일',
    password_hash VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
    nickname VARCHAR(50) NOT NULL UNIQUE COMMENT '앱 내에서 사용할 별명',
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER' COMMENT '사용자 권한 (일반/관리자)',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '계정 생성 일시',
    resetPasswordToken VARCHAR(255),
    resetPasswordExpires TIMESTAMP
);

-- =================================================================================
-- 2. Characters (캐릭터)
-- =================================================================================
CREATE TABLE Characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE COMMENT 'Users(id) 참조 (1:1)',
    characterName VARCHAR(50) DEFAULT '캐릭터',
    characterImage VARCHAR(100) DEFAULT 'snoopy1',
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- =================================================================================
-- 3. StudyLogs (순공 기록)
-- =================================================================================
CREATE TABLE StudyLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    startTime TIMESTAMP NULL DEFAULT NULL,
    endTime TIMESTAMP NULL DEFAULT NULL,
    duration INT NULL DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- =================================================================================
-- 4. Todos (할 일)
-- =================================================================================
CREATE TABLE Todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    memo TEXT NULL DEFAULT NULL,
    isCompleted BOOLEAN DEFAULT FALSE,
    dueDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =================================================================================
-- 5. Diaries (일기)
-- =================================================================================
CREATE TABLE Diaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    diaryDate DATE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- =================================================================================
-- 6. Announcements (공지사항)
-- =================================================================================
CREATE TABLE Announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    adminId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (adminId) REFERENCES Users(id) ON DELETE CASCADE
);

-- =================================================================================
-- 7. FAQs (자주 묻는 질문)
-- =================================================================================
CREATE TABLE FAQs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    adminId INT NOT NULL,
    category VARCHAR(50),
    question VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (adminId) REFERENCES Users(id) ON DELETE CASCADE
);

-- =================================================================================
-- 8. Inquiries (1:1 문의)
-- =================================================================================
CREATE TABLE Inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status ENUM('pending', 'answered') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answerAdminId INT,
    answer TEXT,
    answeredAt TIMESTAMP NULL,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (answerAdminId) REFERENCES Users(id) ON DELETE SET NULL
);

-- =================================================================================
-- 9. WordSets (단어장)
-- =================================================================================
CREATE TABLE WordSets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    setTitle VARCHAR(100) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- =================================================================================
-- 10. Words (단어)
-- =================================================================================
CREATE TABLE Words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wordSetId INT NOT NULL,
    question VARCHAR(255) NOT NULL,
    answer VARCHAR(255) NOT NULL,
    FOREIGN KEY (wordSetId) REFERENCES WordSets(id) ON DELETE CASCADE
);

CREATE TABLE CharacterTemplates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    level INT NOT NULL,
    imagePath VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);