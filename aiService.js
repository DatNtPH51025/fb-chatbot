const axios = require("axios");
const stringSimilarity = require("string-similarity");
const { getSheetData, appendSheetData } = require("./googleSheets");

// Hàm gọi Gemini AI
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

// Hàm gọi Gemini với dữ liệu FAQ và LearnedFAQ
async function callGeminiWithSheet(userMessage, faqData, learnedData, sheetId) {
    // 1️⃣ Kiểm tra LearnedFAQ trước (học từ câu hỏi trước đó)
    if (learnedData?.length) {
        const learnedQuestions = learnedData.map(row => row[0]);
        const bestMatch = stringSimilarity.findBestMatch(userMessage, learnedQuestions);
        if (bestMatch.bestMatch.rating > 0.5) {
            const idx = learnedQuestions.indexOf(bestMatch.bestMatch.target);
            return learnedData[idx][1]; // trả lời ngay từ LearnedFAQ
        }
    }

    // 2️⃣ Kiểm tra FAQ gốc
    if (faqData?.length) {
        const faqQuestions = faqData.map(row => row[0]);
        const bestMatch = stringSimilarity.findBestMatch(userMessage, faqQuestions);
        if (bestMatch.bestMatch.rating > 0.5) {
            const idx = faqQuestions.indexOf(bestMatch.bestMatch.target);
            return faqData[idx][1]; // trả lời ngay từ FAQ
        }
    }

    // 3️⃣ Nếu không match, gọi AI
    const faqText = faqData.map(row => `${row[0]}: ${row[1]}`).join("\n");
    const prompt = `
Bạn là nhân viên tư vấn bán hàng. 
Dưới đây là dữ liệu từ Google Sheets:

${faqText}

Người dùng hỏi: "${userMessage}"

👉 Trả lời tự nhiên, lịch sự, chỉ dựa trên dữ liệu trong Google Sheets.
Nếu không tìm thấy thông tin, hãy nói "Xin lỗi, hiện tại tôi chưa có thông tin này".
`;

    const reply = await callGemini(prompt);

    // 4️⃣ Lưu câu hỏi + câu trả lời mới vào LearnedFAQ
    if (sheetId) {
        try {
            await appendSheetData(sheetId, "LearnedFAQ", [userMessage, reply]);
        } catch (err) {
            console.error("❌ Lỗi lưu LearnedFAQ:", err.message);
        }
    }

    return reply;
}

module.exports = { callGemini, callGeminiWithSheet };
