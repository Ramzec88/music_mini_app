import { google } from 'googleapis';

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, sheetName, range, searchValue, values, newValue } = req.body;

  try {
    let response;

    switch (action) {
      // 1. Чтение данных
      case 'get':
        if (!range) {
          return res.status(400).json({ error: 'Range is required for get' });
        }
        response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!${range}`,
        });
        break;

      // 2. Поиск по первому столбцу
      case 'find':
        const findResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: sheetName,
        });
        const rows = findResponse.data.values || [];
        const row = rows.find(r => (r[0] || '').trim().toLowerCase() === (searchValue || '').trim().toLowerCase());
        response = { data: row || null };
        break;

      // 3. Добавление строки
      case 'append':
        if (!values || typeof values !== 'string') {
          return res.status(400).json({ error: 'Values must be a comma-separated string for append' });
        }
        response = await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: sheetName,
          valueInputOption: 'RAW',
          requestBody: { values: [values.split(',')] },
        });
        break;

      // 4. Обновление ячейки
      case 'update':
        if (!range) {
          return res.status(400).json({ error: 'Range is required for update' });
        }
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

    res.status(200).json(response.data || response);
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    res.status(500).json({ error: 'Internal Google Sheets API error', details: error.message });
  }
}
