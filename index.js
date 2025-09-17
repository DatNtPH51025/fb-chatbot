const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Root route
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

// Health check
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// Endpoint xác minh webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Endpoint nhận tin nhắn
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      if (event?.message?.text) {
        const senderId = event.sender.id;
        const receivedText = event.message.text;

        console.log("User:", receivedText);

        // Trả lời lại
        sendMessage(senderId, `Bạn vừa nói: "${receivedText}"`);
      }
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Hàm gửi tin nhắn qua Graph API
const sendMessage = async (recipientId, text) => {
  const fetch = (await import("node-fetch")).default;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      })
    });

    const json = await res.json();
    console.log("Sent:", json);
  } catch (err) {
    console.error("Error sending message:", err);
  }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
