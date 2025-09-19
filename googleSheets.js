const { google } = require("googleapis");

async function getSheetData(sheetId, sheetName) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:B`, // A = key, B = câu trả lời
        });

        return response.data.values;
    } catch (err) {
        console.error("❌ Lỗi đọc Google Sheets:", err);
        return null;
    }
}

module.exports = { getSheetData };
