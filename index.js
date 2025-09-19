require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios"); // ✅ thay fetch bằng axios
const { getSheetData } = require("./googleSheets");

const app = express();
app.use(bodyParser.json());

// Xác minh webhook
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

// Nhận & trả lời tin nhắn
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
          let reply = "Xin lỗi, tôi không hiểu.";

          if (values) {
            const found = values.find(row => row[0]?.toLowerCase() === userMessage.toLowerCase());
            if (found) reply = found[1];
          }

          // Gửi trả lời về Messenger bằng axios
          await axios.post(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            {
              recipient: { id: senderId },
              message: { text: reply },
            },
            {
              headers: { "Content-Type": "application/json" },
            }
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
