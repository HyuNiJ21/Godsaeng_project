/**
 * 갓생 제조기 - 1:1 문의 API 라우터
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// ----------------------------------------------------------------
// [GET] /api/inquiry : 내가 작성한 1:1 문의 목록 조회
// ----------------------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT id, title, content, status, createdAt, answer, answeredAt 
      FROM Inquiries 
      WHERE userId = ? 
      ORDER BY createdAt DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('1:1 문의 조회 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ----------------------------------------------------------------
// [POST] /api/inquiry : 새 1:1 문의 작성
// ----------------------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });
    }

    const sql = `
      INSERT INTO Inquiries (userId, title, content, status) 
      VALUES (?, ?, ?, 'pending')
    `;
    const [result] = await pool.execute(sql, [userId, title, content]);
    
    res.status(201).json({ 
      message: '문의가 성공적으로 등록되었습니다.',
      inquiryId: result.insertId 
    });
  } catch (error) {
    console.error('1:1 문의 작성 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;