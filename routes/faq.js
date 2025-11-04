/**
 * 갓생 제조기 - FAQ API 라우터
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
// (참고: FAQ는 로그인 없이도 볼 수 있어야 하므로 authMiddleware를 사용하지 않습니다)

// ----------------------------------------------------------------
// [GET] /api/faq : FAQ 목록 전체 조회
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT id, category, question, answer 
      FROM FAQs 
      ORDER BY category, id DESC
    `;
    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('FAQ 조회 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;