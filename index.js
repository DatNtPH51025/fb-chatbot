require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { getSheetData } = require("./googleSheets");

const app = express();
app.use(bodyParser.json());

app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        const event = entry.messaging && entry.messaging[0];
        if (event?.message?.text) {
          const senderId = event.sender.id;
          const userMessage = event.message.text.trim();

          // Lấy dữ liệu từ Google Sheets
          const values = await getSheetData(process.env.SHEET_ID, process.env.SHEET_NAME);
          let reply = null;

          if (values) {
            const found = values.find(row => row[0]?.toLowerCase() === userMessage.toLowerCase());
            if (found) {
              reply = found[1];
            }
          }

          // Nếu không tìm thấy trong Google Sheets → gọi Gemini AI
          if (!reply) {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: userMessage }] }]
                })
              }
            );
            const data = await geminiRes.json();
            reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
              || "Xin lỗi, tôi không hiểu.";
          }

          // Gửi trả lời về Messenger
          await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: reply },
            }),
          });
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("❌ Lỗi webhook:", err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`);
});
