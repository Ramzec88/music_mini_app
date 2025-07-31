import { google } from 'googleapis';

// Парсим JSON из GOOGLE_PRIVATE_KEY
const credentials = JSON.parse(process.env.GOOGLE_PRIVATE_KEY);

// Преобразуем ключ с экранированными \n в настоящий
const privateKey = credentials.private_key.replace(/\\n/g, '\n');
const clientEmail = credentials.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

const auth = new google.auth.JWT(
  clientEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  try {
    const { action, range, sheet, values, searchValue, cell, newValue } = req.body;

    switch (action) {
      case 'get': {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
          range: `${sheet}!${range}`,
        });
        return res.status(200).json(response.data);
      }

      case 'find': {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
          range: sheet,
        });

        const rows = response.data.values || [];
        const foundRow = rows.find((row) => row[0] === searchValue);
        return res.status(200).json({ data: foundRow || null });
      }

      case 'append': {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
          range: sheet,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [values.split(',')] },
        });
        return res.status(200).json(response.data);
      }

      case 'update': {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
          range: `${sheet}!${cell}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[newValue]] },
        });
        return res.status(200).json(response.data);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Google Sheets API error:', error);
    return res.status(500).json({ error: error.message, details: error.stack });
  }
}
