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
    // Проверяем наличие переменных окружения для Сервисного Аккаунта
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyBase64 = process.env.GOOGLE_PRIVATE_KEY_BASE64;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!clientEmail || !privateKeyBase64 || !spreadsheetId) {
      console.error('Missing environment variables for Service Account:', {
        hasClientEmail: !!clientEmail,
        hasPrivateKeyBase64: !!privateKeyBase64,
        hasSpreadsheetId: !!spreadsheetId
      });
      
      res.status(500).json({ 
        error: 'Configuration error: Missing Service Account environment variables',
        GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
        GOOGLE_PRIVATE_KEY_BASE64: '', // Пустое значение, чтобы не раскрывать ключ
        GOOGLE_SPREADSHEET_ID: ''
      });
      return;
    }

    // Возвращаем конфигурацию (без приватного ключа для безопасности)
    res.status(200).json({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: clientEmail,
      GOOGLE_SPREADSHEET_ID: spreadsheetId,
      status: 'success',
      message: 'Service Account configuration found'
    });

  } catch (error) {
    console.error('API Error in env.js:', error);
    
    res.status(500).json({ 
      error: 'Internal server error in env.js',
      details: error.message
    });
  }
}
