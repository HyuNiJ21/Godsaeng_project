/**
 * 갓생 제조기 - 메인 서버 파일
 */
const express = require('express');
const cors = require('cors');
const path = require("path");
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const todosRoutes = require('./routes/todos');
const diaryRoutes = require('./routes/diary');
const studyRoutes = require('./routes/study');
const wordsRoutes = require('./routes/words');
const faqRouter = require('./routes/faq');
const inquiryRouter = require('./routes/inquiry');
const rankingRoutes = require('./routes/ranking');
const noticeRoutes = require('./routes/notice');
const adminRoutes = require("./routes/admin")
const characterRoutes = require("./routes/character");
const adminCharacterRoutes = require("./routes/adminCharacter");
const adminGameRoutes = require("./routes/adminGame");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API 라우터 연결
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
app.use('/api/admin', adminRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/admin/characters", adminCharacterRoutes);
app.use("/api/admin/game", adminGameRoutes);

// 서버 실행
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
