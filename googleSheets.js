const { google } = require("googleapis");

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

module.exports = { getSheetData, appendSheetData };
