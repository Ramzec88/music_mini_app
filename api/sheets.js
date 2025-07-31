// api/sheets.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, sheetName, range, values, searchValue, newValue } = req.body;

    // Парсим JSON ключа
    const serviceAccount = JSON.parse(process.env.GOOGLE_PRIVATE_KEY_BASE64);
    const CLIENT_EMAIL = serviceAccount.client_email;
    const PRIVATE_KEY = serviceAccount.private_key.replace(/\\n/g, '\n');
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    let response;

    switch (action) {
      case 'get': // Чтение диапазона
        response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!${range}`,
        });
        break;

      case 'find': // Поиск первой строки по значению в первом столбце
        const findResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: sheetName,
        });
        const row = (findResponse.data.values || []).find(r => r[0] === searchValue);
        response = { data: row || null };
        break;

      case 'append': // Добавление строки
        response = await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: sheetName,
          valueInputOption: 'RAW',
          requestBody: { values: [Array.isArray(values) ? values : values.split(',')] },
        });
        break;

      case 'update': // Обновление ячейки
        response = await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!${range}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[newValue]] },
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json(response.data || response);
  } catch (err) {
    console.error('❌ Google Sheets API error:', err);
    return res.status(500).json({
      error: 'Internal Google Sheets API error',
      details: err.message || err,
    });
  }
}
