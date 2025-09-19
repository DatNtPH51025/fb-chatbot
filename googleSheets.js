const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // full quyền đọc/ghi
});

// Đọc dữ liệu
async function getSheetData(sheetId, sheetName) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:B`, // A = key, B = value
        });

        return response.data.values || [];
    } catch (err) {
        console.error("❌ Lỗi đọc Google Sheets:", err.message);
        return null;
    }
}

// Ghi thêm dữ liệu
async function appendSheetData(sheetId, sheetName, values) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: sheetName,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [values] },
        });

        console.log("✅ Đã thêm dữ liệu vào Google Sheets:", values);
    } catch (err) {
        console.error("❌ Lỗi ghi Google Sheets:", err.message);
    }
}

module.exports = { getSheetData, appendSheetData };
