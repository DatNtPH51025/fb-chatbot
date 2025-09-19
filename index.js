require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { getSheetData, appendSheetData } = require("./googleSheets");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ Hàm gọi Gemini API
async function callGemini(prompt) {
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi không hiểu.";
  } catch (err) {
    console.error("⚠️ Lỗi AI:", err.response?.data || err.message);
    return "Xin lỗi, tôi không hiểu.";
  }
}

// ✅ Webhook xác minh
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Xử lý tin nhắn
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        const event = entry.messaging && entry.messaging[0];
        if (event?.message?.text) {
          const senderId = event.sender.id;
          const userMessage = event.message.text.trim();

          console.log("📩 USER_MESSAGE:", userMessage);

          // 1. Kiểm tra Google Sheets
          let reply = "Xin lỗi, tôi không hiểu.";
          const values = await getSheetData(SHEET_ID, SHEET_NAME);

          if (values) {
            const found = values.find(
              row => row[0]?.toLowerCase() === userMessage.toLowerCase()
            );
            if (found) {
              reply = found[1];
            } else {
              // 2. Nếu không có → fallback sang AI
              reply = await callGemini(userMessage);
            }
          }

          console.log("🤖 BOT_REPLY:", reply);

          // 3. Lưu lịch sử chat vào ChatHistory
          await appendSheetData(SHEET_ID, "ChatHistory", [
            new Date().toISOString(),
            senderId,
            userMessage,
            reply,
          ]);

          // 4. Gửi trả lời về Messenger
          await axios.post(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
              recipient: { id: senderId },
              message: { text: reply },
            },
            { headers: { "Content-Type": "application/json" } }
          );
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("❌ Lỗi webhook:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`);
});
