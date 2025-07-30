export default function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Обрабатываем OPTIONS запрос
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Проверяем наличие переменных окружения
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!apiKey || !spreadsheetId) {
      console.error('Missing environment variables:', {
        hasApiKey: !!apiKey,
        hasSpreadsheetId: !!spreadsheetId
      });
      
      res.status(500).json({ 
        error: 'Configuration error: Missing environment variables',
        GOOGLE_SHEETS_API_KEY: '',
        GOOGLE_SPREADSHEET_ID: ''
      });
      return;
    }

    // Возвращаем конфигурацию
    res.status(200).json({
      GOOGLE_SHEETS_API_KEY: apiKey,
      GOOGLE_SPREADSHEET_ID: spreadsheetId,
      status: 'success'
    });

  } catch (error) {
    console.error('API Error:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      GOOGLE_SHEETS_API_KEY: '',
      GOOGLE_SPREADSHEET_ID: ''
    });
  }
}
