/**
 * 갓생 제조기 - 1:1 문의 API 라우터
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

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
// [GET] /api/inquiry/:inquiryId : 내가 작성한 1:1 문의 상세 조회
// ----------------------------------------------------------------
router.get('/:inquiryId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { inquiryId } = req.params;

    const sql = `
      SELECT id, title, content, status, createdAt, answer, answeredAt 
      FROM Inquiries 
      WHERE id = ? AND userId = ?
    `;
    const [rows] = await pool.execute(sql, [inquiryId, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: '문의를 찾을 수 없거나 권한이 없습니다.' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('1:1 문의 상세 조회 API 오류:', error);
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

// ----------------------------------------------------------------
// [PUT] /api/inquiry/:inquiryId : 1:1 문의 수정
// ----------------------------------------------------------------
router.put('/:inquiryId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { inquiryId } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });
    }

    // 1. 문의가 존재하는지, 해당 유저가 작성한 것이 맞는지 확인
    const checkSql = 'SELECT * FROM Inquiries WHERE id = ? AND userId = ?';
    const [checkRows] = await pool.execute(checkSql, [inquiryId, userId]);

    if (checkRows.length === 0) {
      return res.status(404).json({ message: '수정할 문의를 찾을 수 없거나 권한이 없습니다.' });
    }
    
    // 2. 답변이 달린 문의는 수정 불가
    if (checkRows[0].status === 'answered') {
      return res.status(403).json({ message: '답변이 완료된 문의는 수정할 수 없습니다.' });
    }

    // 3. 문의 내용 수정
    const updateSql = `
      UPDATE Inquiries 
      SET title = ?, content = ? 
      WHERE id = ?
    `;
    await pool.execute(updateSql, [title, content, inquiryId]);

    res.status(200).json({ message: '문의가 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('1:1 문의 수정 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ----------------------------------------------------------------
// [DELETE] /api/inquiry/:inquiryId : 1:1 문의 삭제
// ----------------------------------------------------------------
router.delete('/:inquiryId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { inquiryId } = req.params;

    // 1. 문의가 존재하는지, 해당 유저가 작성한 것이 맞는지 확인
    const checkSql = 'SELECT * FROM Inquiries WHERE id = ? AND userId = ?';
    const [checkRows] = await pool.execute(checkSql, [inquiryId, userId]);

    if (checkRows.length === 0) {
      return res.status(404).json({ message: '삭제할 문의를 찾을 수 없거나 권한이 없습니다.' });
    }
    
    // 2. 답변이 달린 문의는 삭제 불가
    if (checkRows[0].status === 'answered') {
      return res.status(403).json({ message: '답변이 완료된 문의는 삭제할 수 없습니다.' });
    }

    // 3. 문의 삭제
    const deleteSql = 'DELETE FROM Inquiries WHERE id = ?';
    await pool.execute(deleteSql, [inquiryId]);

    res.status(200).json({ message: '문의가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('1:1 문의 삭제 API 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;