const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

router.get("/login", (req, res) => {
  const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
  const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;

  const kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize?response_type=code` +
    `&client_id=${REST_API_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  res.json({ url: kakaoAuthUrl });
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
  const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
  const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;

  try {
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: REST_API_KEY,
          redirect_uri: REDIRECT_URI,
          code,
          client_secret: CLIENT_SECRET,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const kakaoUser = userResponse.data;

    const kakaoAccount = kakaoUser.kakao_account || {};
    const kakaoProps = kakaoUser.properties || {};

    // 이메일 없으면 자동 생성
    const email =
      kakaoAccount.email || `${kakaoUser.id}@kakao-temp.com`;

    const nickname = kakaoProps.nickname || "카카오사용자";

    // DB 조회
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let userId;

    if (rows.length === 0) {
      const [result] = await pool.query(
        "INSERT INTO users (email, password_hash, nickname, role) VALUES (?, ?, ?, ?)",
        [email, "SOCIAL_LOGIN", nickname, "USER"]
      );
      userId = result.insertId;
    } else {
      userId = rows[0].id;
    }

    const token = jwt.sign(
      { id: userId, email, role: "USER" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.redirect(
      `http://localhost:3000/user/auth/Login?token=${token}`
    );

  } catch (error) {
    console.error("🔥 카카오 로그인 에러 상세:", error.response?.data || error);

    return res.status(500).json({
      message: "카카오 로그인 실패",
      error: error.response?.data || error.toString(),
    });
  }
});

module.exports = router;
