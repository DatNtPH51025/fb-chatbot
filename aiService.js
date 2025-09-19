const axios = require("axios");

// Hàm gọi Gemini AI
async function callGemini(prompt) {
    try {
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );

        const aiReply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return (aiReply || "Xin lỗi, tôi không có thông tin về điều này.").toString();
    } catch (err) {
        console.error("⚠️ Lỗi AI:", err.response?.data || err.message);
        return "Xin lỗi, tôi không có thông tin về điều này.";
    }
}

// Hàm gọi AI dựa trên dữ liệu từ Google Sheets + LearnedFAQ
async function callGeminiWithSheet(userMessage, sheetData = []) {
    // Tạo knowledge base từ dữ liệu
    const context = sheetData
        .map(row => `${row[0] || ""}: ${row[1] || ""}`)
        .join("\n");

    const prompt = `
Bạn là một nhân viên tư vấn chuyên nghiệp của ứng dụng. 
Hãy trả lời tự nhiên, lịch sự, thân thiện, giống nhân viên tư vấn thực thụ.
Bạn có thể dựa vào dữ liệu dưới đây từ Google Sheets và các câu hỏi đã học:

${context}

Người dùng hỏi: "${userMessage || ""}"

👉 Nhiệm vụ:  
- Trả lời rõ ràng, chi tiết, thân thiện như nhân viên tư vấn.  
- Nếu không có thông tin trong dữ liệu, hãy nói: "Xin lỗi, hiện tại tôi chưa có thông tin này".  
- Không bịa câu trả lời, chỉ dựa vào dữ liệu có sẵn.
`;

    return await callGemini(prompt);
}

module.exports = { callGemini, callGeminiWithSheet };
