const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const multer = require("multer");
const xlsx = require("xlsx");

// ---------------------------------------
// 1) 단어 세트 목록 조회
// ---------------------------------------
router.get("/sets", authMiddleware, adminOnly, async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT id, setTitle, userId, createdAt 
    FROM WordSets 
    ORDER BY createdAt DESC
  `);
  res.json(rows);
});

// ---------------------------------------
// 2) 단어 세트 생성
// ---------------------------------------
router.post("/sets", authMiddleware, adminOnly, async (req, res) => {
  const { title } = req.body;
  const adminId = req.user.id; // 관리자 계정 userId 사용

  await pool.execute(
    "INSERT INTO WordSets (userId, setTitle) VALUES (?, ?)",
    [adminId, title]
  );

  res.json({ message: "세트 생성 완료!" });
});

// ---------------------------------------
// 3) 단어 세트 삭제
// ---------------------------------------
router.delete("/sets/:id", authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;

  await pool.execute("DELETE FROM WordSets WHERE id = ?", [id]);

  res.json({ message: "세트 삭제 완료" });
});

// ---------------------------------------
// 4) 특정 세트 → 단어 목록 조회
// ---------------------------------------
router.get("/sets/:id/words", authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.execute(
    "SELECT * FROM Words WHERE wordSetId = ?",
    [id]
  );

  res.json(rows);
});

// ---------------------------------------
// 5) 단어 추가
// ---------------------------------------
router.post("/word", authMiddleware, adminOnly, async (req, res) => {
  const { wordSetId, question, answer } = req.body;

  await pool.execute(
    "INSERT INTO Words (wordSetId, question, answer) VALUES (?, ?, ?)",
    [wordSetId, question, answer]
  );

  res.json({ message: "단어 추가 완료" });
});

// ---------------------------------------
// 6) 단어 삭제
// ---------------------------------------
router.delete("/word/:id", authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;

  await pool.execute("DELETE FROM Words WHERE id = ?", [id]);

  res.json({ message: "단어 삭제 완료" });
});

// ---------------------------------------
// 7) 엑셀 업로드로 단어 세트 생성
// ---------------------------------------

const upload = multer({ dest: "uploads/excel" });

router.post(
  "/upload",
  authMiddleware,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const { title } = req.body;
    const adminId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "파일 없음" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // WordSet 생성
    const [result] = await pool.execute(
      "INSERT INTO WordSets (userId, setTitle) VALUES (?, ?)",
      [adminId, title]
    );

    const wordSetId = result.insertId;

    // Words 삽입
    for (let row of rows) {
      await pool.execute(
        "INSERT INTO Words (wordSetId, question, answer) VALUES (?, ?, ?)",
        [wordSetId, row.question, row.answer]
      );
    }

    res.json({ message: "엑셀 업로드 완료" });
  }
);

// 단어 수정
router.put("/word/:id", authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;

  await pool.execute(
    "UPDATE Words SET question = ?, answer = ? WHERE id = ?",
    [question, answer, id]
  );

  res.json({ message: "단어 수정 완료" });
});

module.exports = router;
