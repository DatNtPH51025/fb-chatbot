import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


// Xác minh webhook
app.get("/webhook", (req, res) => {
  console.log("📩 ĐÃ NHẬN GỌI POST /webhook");
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Xử lý tin nhắn từ FB
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        for (const event of entry.messaging) {
          // Bỏ qua echo message do chính Page gửi
          if (event.message?.is_echo) {
            console.log("👉 Bỏ qua echo từ page");
            continue;
          }

          if (event.message?.text) {
            const senderId = event.sender.id;
            const userMessage = event.message.text;

            console.log("📩 USER_MESSAGE:", userMessage);

            // Gọi Gemini API
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: userMessage }] }]
                })
              }
            );
            const data = await geminiRes.json();
            const reply =
              data?.candidates?.[0]?.content?.parts?.[0]?.text ||
              "Xin lỗi, tôi không hiểu.";

            console.log("🤖 BOT_REPLY:", reply);

            // Gửi trả lời về Messenger
            await fetch(
              `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  recipient: { id: senderId },
                  message: { text: reply }
                })
              }
            );
          }
        }
      }
      res.sendStatus(200); // trả về OK ngay để tránh retry
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("❌ Lỗi webhook:", err);
    res.sendStatus(500);
  }
});

app.listen(8080, () => console.log("Server đang chạy trên cổng 8080"));
