const axios = require("axios");

// Hàm cơ bản gọi Gemini AI với prompt
async function callGemini(prompt) {
    try {
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );

        return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi không hiểu.";
    } catch (err) {
        console.error("⚠️ Lỗi AI:", err.response?.data || err.message);
        return "Xin lỗi, tôi không hiểu.";
    }
}

// Gọi Gemini dựa trên dữ liệu từ Google Sheets
async function callGeminiWithSheet(userMessage, sheetData) {
    const faqText = sheetData.map(row => `${row[0]}: ${row[1]}`).join("\n");

    const prompt = `
Bạn là nhân viên tư vấn bán hàng. 
Dưới đây là dữ liệu từ Google Sheets:

${faqText}

Người dùng hỏi: "${userMessage}"

👉 Trả lời tự nhiên, lịch sự, chỉ dựa trên dữ liệu trong Google Sheets.
Nếu không tìm thấy thông tin, hãy nói "Xin lỗi, hiện tại tôi chưa có thông tin này".
`;

    return await callGemini(prompt);
}

module.exports = { callGemini, callGeminiWithSheet };
