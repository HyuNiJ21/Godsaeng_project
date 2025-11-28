/**
 * 갓생 제조기 - 데이터베이스 연결 설정
 */
require('dotenv').config();
const mysql = require('mysql2/promise');


// DB 에서 받은 접속 정보를 바탕으로 설정 객체를 만듬
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// DB 커넥션 풀 생성
const pool = mysql.createPool(dbConfig);

// 다른 파일에서 이 pool을 가져다 쓸 수 있도록 내보내기
module.exports = pool;
