/**
 * 관리자용 1:1 문의 API
 */

const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const authMiddleware = require("../middleware/auth");
const { adminOnly } = require("../middleware/auth");


// ================================================================
// ⚡ 1) 모든 문의 조회 (관리자 전용)
// GET /api/admin/inquiry
// ================================================================
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const sql = `
      SELECT 
        Inquiries.id,
        Inquiries.userId,
        Users.nickname AS nickname,
        Inquiries.title,
        Inquiries.content,
        Inquiries.status,
        Inquiries.answer,
        Inquiries.createdAt,
        Inquiries.answeredAt
      FROM Inquiries
      JOIN Users ON Users.id = Inquiries.userId
      ORDER BY Inquiries.createdAt DESC
    `;

    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error("관리자 문의 조회 오류:", error);
    res.status(500).json({ message: "문의 목록을 불러오는 중 오류 발생" });
  }
});


// ================================================================
// ⚡ 2) 특정 문의 조회
// GET /api/admin/inquiry/:id
// ================================================================
router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `
      SELECT 
        Inquiries.*,
        Users.nickname AS nickname
      FROM Inquiries
      JOIN Users ON Users.id = Inquiries.userId
      WHERE Inquiries.id = ?
    `;  

    const [rows] = await pool.execute(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "해당 문의를 찾을 수 없습니다." });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("특정 문의 조회 오류:", error);
    res.status(500).json({ message: "문의 조회 중 오류 발생" });
  }
});


// ================================================================
// ⚡ 3) 관리자 답변 등록 / 수정
// PUT /api/admin/inquiry/:id/answer
// ================================================================
router.put("/:id/answer", authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({ message: "답변 내용을 입력하세요." });
  }

  try {
    const sql = `
      UPDATE Inquiries 
      SET 
        answer = ?,
        status = 'answered',
        answerAdminId = ?,
        answeredAt = NOW()
      WHERE id = ?
    `;

    await pool.execute(sql, [answer, req.user.id, id]);

    res.status(200).json({ message: "답변이 등록되었습니다." });
  } catch (error) {
    console.error("문의 답변 오류:", error);
    res.status(500).json({ message: "답변 저장 중 오류 발생" });
  }
});


module.exports = router;
