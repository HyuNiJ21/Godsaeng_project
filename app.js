/**
 * 갓생 제조기 - 메인 서버 파일
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth'); // 인증 라우터 가져오기
const userRoutes = require('./routes/user');
const todosRoutes = require('./routes/todos');
const diaryRoutes = require('./routes/diary');
const studyRoutes = require('./routes/study');
const wordsRoutes = require('./routes/words');
const faqRouter = require('./routes/faq');
const inquiryRouter = require('./routes/inquiry');
const rankingRoutes = require('./routes/ranking');
const noticeRoutes = require('./routes/notice');

// Express 앱 생성 및 기본 설정
const app = express();
app.use(cors());
app.use(express.json());

// API 라우터 연결
// '/api/auth'로 시작하는 모든 요청은 authRoutes가 처리하도록 설정
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/faq', faqRouter);
app.use('/api/inquiry', inquiryRouter);
app.use('/api/ranking', rankingRoutes);
app.use('/api/notice', noticeRoutes);

// 서버 실행
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
