const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

router.get("/login", (req, res) => {
  const client_id = process.env.NAVER_CLIENT_ID;
  const redirectURI = encodeURIComponent(process.env.NAVER_REDIRECT_URI);

  const state = "RANDOM_STATE_TEST";

  const loginUrl =
    `https://nid.naver.com/oauth2.0/authorize?response_type=code` +
    `&client_id=${client_id}&redirect_uri=${redirectURI}&state=${state}`;

  res.json({ url: loginUrl });
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  try {
    const tokenResponse = await axios.get(
      "https://nid.naver.com/oauth2.0/token",
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.NAVER_CLIENT_ID,
          client_secret: process.env.NAVER_CLIENT_SECRET,
          code,
          state,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 사용자 정보 요청
    const userResponse = await axios.get("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = userResponse.data.response;

    const email = profile.email;
    const nickname = profile.nickname || "NaverUser";

    // DB 저장
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

    return res.redirect(`http://localhost:3000/user/auth/Login?token=${token}`);

  } catch (err) {
    console.error("네이버 로그인 에러:", err);
    res.status(500).json({ message: "네이버 로그인 실패" });
  }
});

module.exports = router;
