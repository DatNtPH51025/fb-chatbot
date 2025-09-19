const { google } = require("googleapis");
const axios = require("axios");

// ✅ Lấy dữ liệu key–value từ sheet
async function getSheetData(sheetId, sheetName) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:B`,
        });

        return response.data.values;
    } catch (err) {
        console.error("❌ Lỗi đọc Google Sheets:", err);
        return null;
    }
}

// ✅ Append dữ liệu vào sheet (lưu lịch sử chat)
async function appendSheetData(sheetId, sheetName, row) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:D`,
            valueInputOption: "RAW",
            resource: { values: [row] },
        });
    } catch (err) {
        console.error("❌ Lỗi ghi Google Sheets:", err);
    }
}
async function callGeminiWithSheet(userMessage, sheetData) {
    try {
        // Tạo knowledge base từ sheet
        const faqText = sheetData
            .map(row => `${row[0]}: ${row[1]}`)
            .join("\n");

        const prompt = `
Bạn là nhân viên tư vấn bán hàng. 
Dưới đây là dữ liệu từ Google Sheets:

${faqText}

Người dùng hỏi: "${userMessage}"

👉 Nhiệm vụ: Trả lời tự nhiên, lịch sự, giống như nhân viên tư vấn,
và chỉ dựa trên dữ liệu trong Google Sheets. Nếu không tìm thấy thông tin, hãy nói "Xin lỗi, hiện tại tôi chưa có thông tin này".
`;

        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );

        return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi không rõ.";
    } catch (err) {
        console.error("⚠️ Lỗi AI:", err.response?.data || err.message);
        return "Xin lỗi, tôi không rõ.";
    }
}

module.exports = { getSheetData, appendSheetData, callGeminiWithSheet };
