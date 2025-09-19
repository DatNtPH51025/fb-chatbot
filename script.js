const chatToggle = document.getElementById("chat-toggle");
const chatBox = document.getElementById("chat-box");
const chatClose = document.getElementById("chat-close");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Toggle mở/đóng chat
chatToggle.onclick = () => chatBox.classList.toggle("hidden");
chatClose.onclick = () => chatBox.classList.add("hidden");

// Gửi tin nhắn
sendBtn.onclick = sendMessage;
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function appendMessage(text, sender) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    userInput.value = "";

    try {
        // Gọi API server Node.js chatbot
        const res = await axios.post("https://fb-chatbot-ibul.onrender.com/chat", {
            message: text
        });

        appendMessage(res.data.reply, "bot");
    } catch (err) {
        appendMessage("❌ Lỗi server, vui lòng thử lại.", "bot");
        console.error(err);
    }
}
