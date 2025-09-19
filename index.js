// require("dotenv").config();
// const express = require("express");
// const bodyParser = require("body-parser");
// const axios = require("axios"); // ✅ thay fetch bằng axios
// const { getSheetData } = require("./googleSheets");

// const app = express();
// app.use(bodyParser.json());

// // Xác minh webhook
// app.get("/webhook", (req, res) => {
//   const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && token === VERIFY_TOKEN) {
//     res.status(200).send(challenge);
//   } else {
//     res.sendStatus(403);
//   }
// });

// // Nhận & trả lời tin nhắn
// app.post("/webhook", async (req, res) => {
//   try {
//     if (req.body.object === "page") {
//       for (const entry of req.body.entry) {
//         const event = entry.messaging && entry.messaging[0];
//         if (event?.message?.text) {
//           const senderId = event.sender.id;
//           const userMessage = event.message.text.trim();

//           // Lấy dữ liệu từ Google Sheets
//           const values = await getSheetData(process.env.SHEET_ID, process.env.SHEET_NAME);
//           let reply = "Xin lỗi, tôi không hiểu.";

//           if (values) {
//             const found = values.find(row => row[0]?.toLowerCase() === userMessage.toLowerCase());
//             if (found) reply = found[1];
//           }

//           // Gửi trả lời về Messenger bằng axios
//           await axios.post(
//             `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
//             {
//               recipient: { id: senderId },
//               message: { text: reply },
//             },
//             {
//               headers: { "Content-Type": "application/json" },
//             }
//           );
//         }
//       }
//       res.sendStatus(200);
//     } else {
//       res.sendStatus(404);
//     }
//   } catch (err) {
//     console.error("❌ Lỗi webhook:", err.response?.data || err.message);
//     res.sendStatus(500);
//   }
// });

// app.listen(process.env.PORT, () => {
//   console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`);
// });
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { getSheetData, appendSheetData } = require("./googleSheets");

const app = express();
app.use(bodyParser.json());

// Bộ nhớ tạm để chống duplicate event
const handledMessages = new Set();

// ✅ Xác minh webhook Facebook
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

// ✅ Xử lý tin nhắn từ Messenger
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        const event = entry.messaging && entry.messaging[0];
        if (event?.message?.text) {
          const senderId = event.sender.id;
          const userMessage = event.message.text.trim();

          // Chống duplicate webhook event
          if (event?.message?.mid && handledMessages.has(event.message.mid)) {
            console.log("⏩ Bỏ qua duplicate:", event.message.mid);
            continue;
          }
          handledMessages.add(event.message.mid);

          console.log("📩 USER_MESSAGE:", userMessage);

          // Lấy dữ liệu từ Google Sheets
          const values = await getSheetData(process.env.SHEET_ID, process.env.SHEET_NAME);
          let reply = "Xin lỗi, tôi không hiểu.";

          if (values) {
            const found = values.find(
              (row) => row[0]?.toLowerCase() === userMessage.toLowerCase()
            );
            if (found) {
              reply = found[1];
            } else {
              // ✅ Fallback AI (Gemini)
              try {
                const aiRes = await axios.post(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
                  { contents: [{ parts: [{ text: userMessage }] }] }
                );
                reply =
                  aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                  reply;
              } catch (aiErr) {
                console.error("⚠️ Lỗi AI:", aiErr.response?.data || aiErr.message);
              }
            }
          }

          console.log("🤖 BOT_REPLY:", reply);

          // Gửi trả lời về Messenger
          await axios.post(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            {
              recipient: { id: senderId },
              message: { text: reply },
            },
            { headers: { "Content-Type": "application/json" } }
          );

          // ✅ Lưu lịch sử hội thoại vào Google Sheets (ChatHistory sheet)
          await appendSheetData(process.env.SHEET_ID, "ChatHistory", [
            new Date().toISOString(),
            senderId,
            userMessage,
            reply,
          ]);
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

// ✅ API quản trị: thêm key–value mới vào Google Sheets
app.post("/admin/add", async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Thiếu key hoặc value" });

    await appendSheetData(process.env.SHEET_ID, process.env.SHEET_NAME, [key, value]);
    res.json({ success: true, message: "Đã thêm key–value vào Google Sheets" });
  } catch (err) {
    console.error("❌ Lỗi /admin/add:", err.message);
    res.status(500).json({ error: "Không thêm được dữ liệu" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`);
});
