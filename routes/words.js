/**
 * 갓생 제조기 - 단어 게임(Word Game) API (리뉴얼 버전)
 * 프론트 WordGamePageCustom와 동일한 구조로 재작성됨
 */

const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const pool = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 셀 정규화 (프론트와 동일)
const normalizeCell = (v) =>
  String(v ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ------------------------------------------------------------------
   [GET] /api/words/template
   → XLSX 템플릿 다운로드
 ------------------------------------------------------------------ */
router.get("/template", authMiddleware, (req, res) => {
  const rows = [
    { word: "sample", correct: "예시" },
    { word: "rain", correct: "비" },
  ];

  const ws = XLSX.utils.json_to_sheet(rows, { header: ["word", "correct"] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Words");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="WordSetTemplate.xlsx"'
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(buffer);
});

/* ------------------------------------------------------------------
   [POST] /api/words/upload
   → XLSX 업로드 → 단어장 생성(DB 저장)
 ------------------------------------------------------------------ */
router.post(
  "/upload",
  authMiddleware,
  upload.single("wordFile"),
  async (req, res) => {
    const userId = req.user.id;
    const { setTitle } = req.body;

    if (!setTitle?.trim()) {
      return res.status(400).json({ message: "세트 이름을 입력해주세요." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "엑셀 파일을 선택해주세요." });
    }

    try {
      /* 1) 엑셀 파싱 */
      const data = req.file.buffer;
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const rows = rowsRaw.map((r) => ({
        word: normalizeCell(r.word),
        correct: normalizeCell(r.correct),
      }));

      // 유효 행 검사
      const validRows = rows.filter((r) => r.word && r.correct);
      if (validRows.length === 0) {
        return res.status(400).json({
          message: "유효한 단어 목록이 없습니다. (word, correct 필요)",
        });
      }

      /* 2) DB 저장 트랜잭션 */
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const createSetSql =
          "INSERT INTO WordSets (userId, setTitle) VALUES (?, ?)";
        const [rsSet] = await conn.execute(createSetSql, [
          userId,
          setTitle.trim(),
        ]);
        const wordSetId = rsSet.insertId;

        // 단어 insert
        const wordValues = validRows.map((w) => [
          wordSetId,
          w.word,
          w.correct,
        ]);

        const insertWordSql =
          "INSERT INTO Words (wordSetId, question, answer) VALUES ?";
        await conn.query(insertWordSql, [wordValues]);

        await conn.commit();

        res.status(201).json({
          message: `"${setTitle}" 단어장이 저장되었습니다.`,
          wordSetId,
        });
      } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ message: "단어장 저장 중 오류 발생" });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "엑셀 파일 처리 오류. 템플릿 형식을 확인해주세요.",
      });
    }
  }
);

/* ------------------------------------------------------------------
   [GET] /api/words/wordsets
   → 사용자 단어장 목록
 ------------------------------------------------------------------ */
router.get("/wordsets", authMiddleware, async (req, res) => {
  try {
    const [rs] = await pool.execute(
      "SELECT id, setTitle, createdAt FROM WordSets WHERE userId = ? ORDER BY createdAt DESC",
      [req.user.id]
    );
    res.json({ wordsets: rs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "목록 조회 오류" });
  }
});

/* ------------------------------------------------------------------
   [GET] /api/words/wordsets/:id
   보기 생성(min(4, 단어 수))
 ------------------------------------------------------------------ */
router.get("/wordsets/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const setId = req.params.id;

  try {
    // 권한 확인
    const [owner] = await pool.execute(
      "SELECT * FROM WordSets WHERE id = ? AND userId = ?",
      [setId, userId]
    );
    if (owner.length === 0) {
      return res.status(404).json({ message: "단어장을 찾을 수 없습니다." });
    }

    // 단어 조회
    const [words] = await pool.execute(
      "SELECT id, question, answer FROM Words WHERE wordSetId = ?",
      [setId]
    );

    const allAnswers = words.map((w) => w.answer);

    const quizList = words.map((word) => {
      const correct = word.answer;

      // 오답 후보
      const wrongCandidates = allAnswers.filter((a) => a !== correct);

      // 보기 개수 = 전체 단어 수 vs 4 → 작은 값
      const optionCount = Math.min(4, allAnswers.length);

      const options = [correct];

      // 오답 섞기
      const shuffled = [...wrongCandidates].sort(() => Math.random() - 0.5);

      for (let i = 0; i < optionCount - 1; i++) {
        if (shuffled[i]) options.push(shuffled[i]);
      }

      // 최종 셔플
      const finalOptions = options.sort(() => Math.random() - 0.5);

      return {
        word: word.question,
        correct,
        options: finalOptions,
      };
    });

    res.json({
      setName: owner[0].setTitle,
      wordList: quizList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "퀴즈 생성 오류" });
  }
});

/* ------------------------------------------------------------------
   [DELETE] /api/words/wordsets/:id
   → 단어장 삭제
 ------------------------------------------------------------------ */
router.delete("/wordsets/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const setId = req.params.id;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [owner] = await conn.execute(
      "SELECT * FROM WordSets WHERE id = ? AND userId = ?",
      [setId, userId]
    );

    if (owner.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "삭제할 수 없습니다." });
    }

    await conn.execute("DELETE FROM Words WHERE wordSetId = ?", [setId]);
    await conn.execute(
      "DELETE FROM WordSets WHERE id = ? AND userId = ?",
      [setId, userId]
    );

    await conn.commit();
    res.json({ message: "단어장이 삭제되었습니다." });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "삭제 중 오류 발생" });
  } finally {
    conn.release();
  }
});

module.exports = router;
