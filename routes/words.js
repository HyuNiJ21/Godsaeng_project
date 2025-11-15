/**
 * 갓생 제조기 - 단어 게임(Word Game) 관련 API 라우터
 */
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const { authMiddleware } = require("../middleware/auth");
const iconv = require("iconv-lite");               // ✨ 추가

const router = express.Router();

// 파일 업로드 multer 설정 (버퍼 저장)
const upload = multer({ storage: multer.memoryStorage() });


// ----------------------------------------------------------------
// [GET] /api/words/template (CSV 템플릿 다운로드)
// ----------------------------------------------------------------
router.get("/template", authMiddleware, (req, res) => {
  const BOM = "\uFEFF"; // UTF-8 BOM 적용 (Excel에서 깨지지 않음)
  const templateData =
    BOM +
    "Question,Answer\n" +
    "Apple,사과\n" +
    "Banana,바나나\n" +
    "Computer,컴퓨터\n";

  res.setHeader("Content-disposition", "attachment; filename=word_template.csv");
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.status(200).send(templateData);
});


// ----------------------------------------------------------------
// [POST] /api/words/upload (CSV 업로드 → 단어장 생성)
// ----------------------------------------------------------------
router.post(
  "/upload",
  authMiddleware,
  upload.single("wordFile"),
  async (req, res) => {
    const userId = req.user.id;
    const { setTitle } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "업로드할 파일을 선택해주세요." });
    }
    if (!setTitle) {
      return res.status(400).json({ message: "단어장 제목을 입력해주세요." });
    }

    const words = [];

    // 🔥 CSV 파싱 (EUC-KR/CP949 → UTF-8 자동 변환) — 핵심 부분
    const stream = require("stream");
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
      .pipe(iconv.decodeStream("euc-kr"))  // ✨ 인코딩 자동 변환
      .pipe(iconv.encodeStream("utf-8"))
      .pipe(csv({ separator: ",", mapHeaders: ({ header }) => header.trim() }))
      .on("data", (row) => {
        if (row.Question && row.Answer) {
          words.push({
            question: row.Question.trim(),
            answer: row.Answer.trim(),
          });
        }
      })
      .on("end", async () => {
        if (words.length === 0) {
          return res.status(400).json({
            message:
              "파일에 유효한 단어가 없습니다. Question,Answer 형식을 확인해주세요.",
          });
        }

        const connection = await pool.getConnection();

        try {
          await connection.beginTransaction();

          // 1) 단어장 추가
          const wordSetSql =
            "INSERT INTO WordSets (userId, setTitle) VALUES (?, ?)";
          const [wordSetResult] = await connection.execute(wordSetSql, [
            userId,
            setTitle,
          ]);
          const newWordSetId = wordSetResult.insertId;

          // 2) 단어 Bulk Insert
          const wordSql =
            "INSERT INTO Words (wordSetId, question, answer) VALUES ?";
          const wordValues = words.map((w) => [
            newWordSetId,
            w.question,
            w.answer,
          ]);
          await connection.query(wordSql, [wordValues]);

          await connection.commit();

          res.status(201).json({
            message: `'${setTitle}' 단어장이 성공적으로 생성되었습니다.`,
            wordSetId: newWordSetId,
            newSet: {
              id: newWordSetId,
              setTitle,
              createdAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          await connection.rollback();
          console.error("단어장 업로드 API 오류:", error);
          res.status(500).json({ message: "서버 오류가 발생했습니다." });
        } finally {
          connection.release();
        }
      });
  }
);


// ----------------------------------------------------------------
// [GET] /api/words/wordsets (내 단어장 목록 조회)
// ----------------------------------------------------------------
router.get("/wordsets", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const sql =
      "SELECT id, setTitle, createdAt FROM WordSets WHERE userId = ? ORDER BY createdAt DESC";
    const [wordSets] = await pool.execute(sql, [userId]);
    res.status(200).json({ wordsets: wordSets });
  } catch (error) {
    console.error("단어장 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});


// ----------------------------------------------------------------
// [GET] /api/words/wordsets/:id (특정 단어장 단어 조회 → 퀴즈)
// ----------------------------------------------------------------
router.get("/wordsets/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const wordSetId = req.params.id;

  try {
    const [ownerCheck] = await pool.execute(
      "SELECT id, setTitle FROM WordSets WHERE id = ? AND userId = ?",
      [wordSetId, userId]
    );

    if (ownerCheck.length === 0) {
      return res.status(404).json({ message: "단어장을 찾을 수 없거나 권한이 없습니다." });
    }

    const [words] = await pool.execute(
      "SELECT id, question, answer FROM Words WHERE wordSetId = ?",
      [wordSetId]
    );

    // 🔥 백엔드에서 보기 4개 자동 생성
    const wordListForQuiz = words.map((word) => {
      const correct = word.answer;

      // 오답 목록
      const wrongOptions = words
        .filter((w) => w.id !== word.id)
        .map((w) => w.answer);

      // 보기 생성
      let options = [correct];
      while (options.length < 4) {
        const pick =
          wrongOptions[Math.floor(Math.random() * wrongOptions.length)] ||
          correct;
        if (!options.includes(pick)) options.push(pick);
        if (wrongOptions.length === 0) break;
      }

      return {
        word: word.question,
        correct,
        options,
      };
    });

    res.status(200).json({
      setName: ownerCheck[0].setTitle,
      wordList: wordListForQuiz,
    });
  } catch (error) {
    console.error("단어 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});


// ----------------------------------------------------------------
// [DELETE] /api/words/wordsets/:id (단어장 삭제)
// ----------------------------------------------------------------
router.delete("/wordsets/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const wordSetId = req.params.id;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [owner] = await connection.execute(
      "SELECT userId FROM WordSets WHERE id = ?",
      [wordSetId]
    );

    if (owner.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "단어장을 찾을 수 없습니다." });
    }
    if (owner[0].userId !== userId) {
      await connection.rollback();
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await connection.execute("DELETE FROM Words WHERE wordSetId = ?", [
      wordSetId,
    ]);
    await connection.execute(
      "DELETE FROM WordSets WHERE id = ? AND userId = ?",
      [wordSetId, userId]
    );

    await connection.commit();

    res.json({ message: "단어장이 성공적으로 삭제되었습니다." });
  } catch (error) {
    await connection.rollback();
    console.error("단어장 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

module.exports = router;
