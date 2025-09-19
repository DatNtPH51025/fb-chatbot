require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const stringSimilarity = require("string-similarity")
const { getSheetData, appendSheetData } = require("./googleSheets");
const { callGeminiWithSheet } = require("./aiService");

const app = express();
app.use(bodyParser.json());

// ✅ Bật CORS cho web
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

// ======= Hàm xử lý chat chung =======
async function handleChat(userMessage, senderId = "web") {
  const faqData = await getSheetData(SHEET_ID, SHEET_NAME);
  const learnedData = await getSheetData(SHEET_ID, "LearnedFAQ");

  let reply = "Xin lỗi, tôi không hiểu.";
  let type = "AI";

  // 1️⃣ Kiểm tra LearnedFAQ
  if (learnedData?.length) {
    const learnedQuestions = learnedData.map(row => row[0]);
    const bestLearned = stringSimilarity.findBestMatch(userMessage, learnedQuestions);
    if (bestLearned.bestMatch.rating > 0.5) {
      reply = learnedData[learnedQuestions.indexOf(bestLearned.bestMatch.target)][1];
      type = "LearnedFAQ";
    }
  }

  // 2️⃣ Kiểm tra FAQ
  if (reply === "Xin lỗi, tôi không hiểu." && faqData?.length) {
    const faqQuestions = faqData.map(row => row[0]);
    const bestFAQ = stringSimilarity.findBestMatch(userMessage, faqQuestions);
    if (bestFAQ.bestMatch.rating > 0.5) {
      reply = faqData[faqQuestions.indexOf(bestFAQ.bestMatch.target)][1];
      type = "FAQ";
    }
  }

  // 3️⃣ Gọi AI nếu chưa tìm được
  if (reply === "Xin lỗi, tôi không hiểu.") {
    reply = await callGeminiWithSheet(userMessage, faqData || []);
    type = "AI";

    // Lưu vào LearnedFAQ
    await appendSheetData(SHEET_ID, "LearnedFAQ", [userMessage, reply]);
  }

  // Lưu lịch sử chat
  await appendSheetData(SHEET_ID, "ChatHistory", [
    new Date().toISOString(),
    senderId,
    userMessage,
    reply,
    type
  ]);

  return reply;
}

// ======= Webhook xác minh Facebook =======
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

// ======= Webhook nhận tin nhắn Messenger =======
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        entry.messaging?.forEach(async event => {
          if (event?.message?.text) {
            const senderId = event.sender.id;
            const userMessage = event.message.text.trim();
            console.log("📩 USER_MESSAGE:", userMessage);

            const reply = await handleChat(userMessage, senderId);

            console.log("🤖 BOT_REPLY:", reply);

            // Gửi trả lời về Messenger
            await axios.post(
              `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
              {
                recipient: { id: senderId },
                message: { text: reply },
              },
              { headers: { "Content-Type": "application/json" } }
            );
          }
        });
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

// ======= Endpoint chat cho web =======
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: "Thiếu message" });

    const reply = await handleChat(userMessage, "web");
    res.json({ reply });
  } catch (err) {
    console.error("❌ Lỗi /chat:", err.message);
    res.status(500).json({ reply: "Xin lỗi, đã có lỗi xảy ra." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server chạy ở cổng ${process.env.PORT}`);
});
