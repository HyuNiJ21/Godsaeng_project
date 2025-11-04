-- =================================================================================
-- 데이터베이스 및 테이블 초기화 (기존 구조 삭제)
-- =================================================================================

-- 외래 키 제약 조건 검사를 일시적으로 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- 테이블을 생성 역순으로 삭제합니다. (외래 키 종속성 때문)
DROP TABLE IF EXISTS Words;
DROP TABLE IF EXISTS WordSets;
DROP TABLE IF EXISTS Inquiries;
DROP TABLE IF EXISTS FAQs;
DROP TABLE IF EXISTS Announcements;
DROP TABLE IF EXISTS Diaries;
DROP TABLE IF EXISTS Todos;
DROP TABLE IF EXISTS StudyLogs;
DROP TABLE IF EXISTS Characters;
DROP TABLE IF EXISTS Users;

-- 외래 키 제약 조건 검사를 다시 활성화합니다.
SET FOREIGN_KEY_CHECKS = 1;

-- 'godsaeng_db' 데이터베이스를 삭제합니다. (필요 시 주석 해제)
-- DROP DATABASE IF EXISTS godsaeng_db;


-- =================================================================================
-- 데이터베이스 및 테이블 생성
-- =================================================================================

-- 'godsaeng_db' 라는 이름의 데이터베이스(저장 공간)를 생성
CREATE DATABASE IF NOT EXISTS godsaeng_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 생성한 데이터베이스를 사용하겠다고 지정합니다.
USE godsaeng_db;

-- 1. Users (사용자 테이블)
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '사용자 고유 식별자',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '로그인 시 사용할 이메일',
    password_hash VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
    nickname VARCHAR(50) NOT NULL UNIQUE COMMENT '앱 내에서 사용할 별명',
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER' COMMENT '사용자 권한 (일반/관리자)',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '계정 생성 일시',
    resetPasswordToken VARCHAR(255) COMMENT '비밀번호 재설정용 임시 토큰',
    resetPasswordExpires TIMESTAMP COMMENT '비밀번호 재설정 토큰 만료 시간'
);

-- 2. Characters (캐릭터 테이블)
CREATE TABLE Characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE COMMENT 'Users(id) 참조 (1:1)',
    characterName VARCHAR(50) DEFAULT '캐릭터' COMMENT '캐릭터 닉네임 (변경 가능)',
    characterImage VARCHAR(100) DEFAULT 'snoopy1' COMMENT '선택한 캐릭터 이미지 ID',
    level INT DEFAULT 1 COMMENT '캐릭터 레벨',
    exp INT DEFAULT 0 COMMENT '캐릭터 경험치',
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 3. StudyLogs (학습 기록 테이블)
CREATE TABLE StudyLogs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '학습 기록 고유 식별자',
    userId INT NOT NULL COMMENT 'Users 테이블의 id 참조',
    startTime TIMESTAMP NULL DEFAULT NULL COMMENT '측정 시작 시간',
    endTime TIMESTAMP NULL DEFAULT NULL COMMENT '측정 종료 시간',
    duration INT NULL DEFAULT NULL COMMENT '총 학습 시간 (초 단위)',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '기록 생성 일시',
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 4. Todos (할 일 테이블)
CREATE TABLE Todos (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '할 일 고유 식별자',
    userId INT NOT NULL COMMENT 'Users 테이블의 id 참조',
    title VARCHAR(255) NOT NULL COMMENT '할 일 제목',
    memo TEXT NULL DEFAULT NULL COMMENT '할 일 메모',
    isCompleted BOOLEAN DEFAULT FALSE COMMENT '완료 여부',
    dueDate DATE COMMENT '마감 날짜',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시'
);

-- 5. Diaries (학습 일기 테이블)
CREATE TABLE Diaries (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '일기 고유 식별자',
    userId INT NOT NULL COMMENT 'Users 테이블의 id 참조',
    title VARCHAR(255) NOT NULL COMMENT '일기 제목',
    content TEXT COMMENT '일기 내용',
    diaryDate DATE NOT NULL COMMENT '일기가 해당하는 날짜',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 6. Announcements (공지사항 테이블)
CREATE TABLE Announcements (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '공지사항 고유 식별자',
    adminId INT NOT NULL COMMENT '작성한 관리자의 Users 테이블 id',
    title VARCHAR(255) NOT NULL COMMENT '공지 제목',
    content TEXT NOT NULL COMMENT '공지 내용',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
    FOREIGN KEY (adminId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 7. FAQs (자주 묻는 질문 테이블)
CREATE TABLE FAQs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'FAQ 고유 식별자',
    adminId INT NOT NULL COMMENT '작성한 관리자의 Users 테이블 id',
    category VARCHAR(50) COMMENT 'FAQ 분류',
    question VARCHAR(255) NOT NULL COMMENT '질문',
    answer TEXT NOT NULL COMMENT '답변',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
    FOREIGN KEY (adminId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 8. Inquiries (1:1 문의 테이블)
CREATE TABLE Inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '문의 고유 식별자',
    userId INT NOT NULL COMMENT '질문한 사용자의 Users 테이블 id',
    title VARCHAR(255) NOT NULL COMMENT '문의 제목',
    content TEXT NOT NULL COMMENT '문의 내용',
    status ENUM('pending', 'answered') DEFAULT 'pending' COMMENT '문의 처리 상태',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '질문 작성 일시',
    answerAdminId INT COMMENT '답변한 관리자의 Users 테이블 id',
    answer TEXT COMMENT '답변 내용',
    answeredAt TIMESTAMP NULL COMMENT '답변 작성 일시',
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (answerAdminId) REFERENCES Users(id) ON DELETE SET NULL
);

-- 9. WordSets (단어장 테이블)
CREATE TABLE WordSets (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '단어장 고유 식별자',
    userId INT NOT NULL COMMENT '생성한 사용자의 Users 테이블 id',
    setTitle VARCHAR(100) NOT NULL COMMENT '단어장 제목',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 10. Words (단어 테이블)
CREATE TABLE Words (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '단어 고유 식별자',
    wordSetId INT NOT NULL COMMENT 'WordSets 테이블의 id 참조',
    question VARCHAR(255) NOT NULL COMMENT '문제 (단어)',
    answer VARCHAR(255) NOT NULL COMMENT '정답 (뜻)',
    FOREIGN KEY (wordSetId) REFERENCES WordSets(id) ON DELETE CASCADE
);
