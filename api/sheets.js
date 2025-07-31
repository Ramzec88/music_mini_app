import { google } from 'googleapis';

// Парсим JSON из GOOGLE_PRIVATE_KEY
// Убедитесь, что GOOGLE_PRIVATE_KEY на Vercel содержит полный JSON-объект
// с полями "private_key" (с \\n вместо \n) и "client_email"
const credentials = JSON.parse(process.env.GOOGLE_PRIVATE_KEY);

// Преобразуем ключ с экранированными \\n в настоящий \n
const privateKey = credentials.private_key.replace(/\\n/g, '\n');
const clientEmail = credentials.client_email; // Используем client_email из JSON

// Инициализация аутентификации JWT
const auth = new google.auth.JWT(
  clientEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets'] // Область доступа для чтения и записи
);

// Инициализация клиента Google Sheets API
const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  // Разрешаем CORS для всех источников (включая Telegram)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Принимаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Деструктурируем параметры из req.body
    // Используем sheetName вместо sheet для ясности и соответствия frontend
    const { action, sheetName, range, values, searchValue, updateRange, updateValue } = req.body;
    
    // Логирование входящего запроса
    console.log('📝 API Request:', { 
      action, 
      sheetName, 
      range, 
      searchValue, 
      updateRange, 
      timestamp: new Date().toISOString()
    });

    // Проверка наличия SPREADSHEET_ID
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    if (!SPREADSHEET_ID) {
      console.error('❌ Missing GOOGLE_SPREADSHEET_ID environment variable');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing GOOGLE_SPREADSHEET_ID',
        solution: 'Add GOOGLE_SPREADSHEET_ID in Vercel Dashboard'
      });
    }

    switch (action) {
      case 'get': {
        // Проверка обязательных параметров
        if (!sheetName) {
          return res.status(400).json({ error: 'Missing required parameter: sheetName for get action' });
        }
        // Формирование диапазона: если range не указан, берем весь лист
        const targetRange = range ? `${sheetName}!${range}` : sheetName; 

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: targetRange,
          });
          console.log('✅ GET response successful:', { 
            range: response.data.range, 
            rowCount: response.data.values ? response.data.values.length : 0 
          });
          return res.status(200).json(response.data);
        } catch (error) {
          console.error('GET Error:', error);
          return handleGoogleApiError(error, res);
        }
      }

      case 'find': {
        // Проверка обязательных параметров
        if (!sheetName || searchValue === undefined) { // searchValue может быть 0
          return res.status(400).json({ error: 'Missing required parameters: sheetName or searchValue for find action' });
        }
        // Для поиска всегда берем весь первый столбец листа
        const searchRange = `${sheetName}!A:A`; 

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: searchRange, 
          });
          
          const rows = response.data.values || [];
          const foundRow = rows.find((row) => row[0] === searchValue);
          
          if (foundRow) {
            const rowIndex = rows.indexOf(foundRow) + 1; // Получаем 1-основанный индекс строки
            console.log('✅ FIND result: found at row', rowIndex);
            return res.status(200).json({ found: true, rowIndex: rowIndex, rowData: foundRow });
          } else {
            console.log('❌ FIND result: not found');
            return res.status(200).json({ found: false });
          }
        } catch (error) {
          console.error('FIND Error:', error);
          return handleGoogleApiError(error, res);
        }
      }

      case 'append': {
        // Проверка обязательных параметров
        if (!sheetName || !values) {
          return res.status(400).json({ error: 'Missing required parameters: sheetName or values for append action' });
        }
        // values приходят как массив, но ваш frontend test_sheets.html отправляет их как строку через запятую
        // Поэтому преобразуем:
        const appendValues = Array.isArray(values) ? values : values.split(',').map(s => s.trim());

        try {
          const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName, // Добавляем на весь лист
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
              values: [appendValues], // Оборачиваем в массив для добавления одной строки
            },
          });
          console.log('✅ APPEND response successful:', response.data);
          return res.status(200).json(response.data);
        } catch (error) {
          console.error('APPEND Error:', error);
          return handleGoogleApiError(error, res);
        }
      }

      case 'update': {
        // Проверка обязательных параметров
        if (!sheetName || !updateRange || updateValue === undefined) { // updateValue может быть 0 или false
          return res.status(400).json({ error: 'Missing required parameters: sheetName, updateRange, or updateValue for update action' });
        }
        // updateRange должен быть в формате A1 (например, "B2")
        const targetRange = `${sheetName}!${updateRange}`;

        try {
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: targetRange,
            valueInputOption: 'RAW',
            resource: {
              values: [[updateValue]], // Оборачиваем в массив для обновления одной ячейки
            },
          });
          console.log('✅ UPDATE response successful:', response.data);
          return res.status(200).json(response.data);
        } catch (error) {
          console.error('UPDATE Error:', error);
          return handleGoogleApiError(error, res);
        }
      }

      case 'test-write-permissions': {
        // Этот action используется для проверки прав записи
        if (!sheetName) { // Для этого теста нужен хотя бы sheetName
          return res.status(400).json({ error: 'Missing required parameter: sheetName for test-write-permissions action' });
        }
        const testRange = `${sheetName}!Z1000`; // Пытаемся записать в фиктивную ячейку
        
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: testRange,
            valueInputOption: 'RAW',
            resource: {
              values: [['test_write_permission']],
            },
          });

          // Очищаем тестовую ячейку (опционально, но хорошая практика)
          await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: testRange,
          });
          
          return res.status(200).json({
            canRead: true, 
            canWrite: true,
            writeError: null,
            recommendations: ['Write permissions are working correctly.']
          });

        } catch (error) {
          console.error('TEST-WRITE-PERMISSIONS Error:', error);
          let writeErrorDetails = 'Unknown error';
          if (error.response && error.response.data && error.response.data.error) {
            writeErrorDetails = error.response.data.error.message;
          } else if (error.message) {
            writeErrorDetails = error.message;
          }
          
          return res.status(403).json({ // Возвращаем 403 Forbidden, если нет прав
            canRead: true, 
            canWrite: false,
            writeError: writeErrorDetails,
            recommendations: [
              'Share the Google Sheet with the Service Account email (Editor role).',
              'Ensure Google Sheets API is enabled in Google Cloud Console.'
            ]
          });
        }
      }

      default:
        console.error('❌ Invalid action:', action);
        return res.status(400).json({ 
          error: 'Invalid action', 
          validActions: ['get', 'append', 'update', 'find', 'test-write-permissions'],
          receivedAction: action
        });
    }
    
  } catch (error) {
    console.error('❌ General API Error in handler:', error);
    
    // Определяем тип ошибки для пользователя
    let userError = 'Internal server error';
    let statusCode = 500;
    let solutions = [];
    
    // Более общие сообщения об ошибках для пользователя
    if (error.message.includes('GOOGLE_PRIVATE_KEY') || error.message.includes('client_email')) {
      userError = 'Server configuration error: Service Account credentials missing or invalid';
      solutions = ['Ensure GOOGLE_PRIVATE_KEY environment variable is set correctly (full JSON with \\n escaped).'];
    } else if (error.message.includes('401')) { 
      userError = 'Authentication failed with Google Sheets API';
      statusCode = 401;
      solutions = [
        'Check if Service Account email in GOOGLE_PRIVATE_KEY is correct',
        'Verify private key is correctly formatted (especially \\n)',
        'Ensure Google Sheets API is enabled in Google Cloud Console'
      ];
    } else if (error.message.includes('403')) {
      userError = 'Access denied to Google Sheets';
      statusCode = 403;
      solutions = [
        'Share the spreadsheet with the Service Account email (Editor role)',
        'Check if Google Sheets API is enabled in Google Cloud Console'
      ];
    } else if (error.message.includes('404')) {
      userError = 'Spreadsheet or sheet not found';
      statusCode = 404;
      solutions = [
        'Verify SPREADSHEET_ID is correct in Vercel',
        'Check if sheet names exist in spreadsheet',
        'Ensure spreadsheet is not deleted'
      ];
    } else if (error.message.includes('Failed to fetch')) {
      userError = 'Cannot connect to Google Sheets API';
      statusCode = 502;
      solutions = [
        'Check internet connectivity from Vercel environment (less likely for Vercel)',
        'Verify Google Sheets API endpoint is accessible',
        'Try again in a few moments'
      ];
    } else if (error.message.includes('JSON.parse')) {
      userError = 'Invalid JSON format for GOOGLE_PRIVATE_KEY';
      solutions = ['Ensure GOOGLE_PRIVATE_KEY is a valid JSON string.'];
    }
    
    return res.status(statusCode).json({ 
      error: userError,
      details: error.message,
      solutions: solutions,
      timestamp: new Date().toISOString()
    });
  }
}

// Вспомогательная функция для обработки ошибок Google API
function handleGoogleApiError(error, res) {
  let statusCode = 500;
  let userError = 'Internal Google Sheets API error';
  let details = error.message;
  let solutions = [];

  if (error.response && error.response.status) {
    statusCode = error.response.status;
    if (error.response.data && error.response.data.error) {
      details = error.response.data.error.message;
    }
  }

  if (statusCode === 401) {
    userError = 'Authentication failed with Service Account';
    solutions = [
      'Check Service Account email in GOOGLE_PRIVATE_KEY is correct.',
      'Verify private key is correctly formatted (especially \\n).'
    ];
  } else if (statusCode === 403) {
    userError = 'Access denied to Google Sheet';
    solutions = [
      'Share the Google Sheet with the Service Account email (Editor role).',
      'Ensure Google Sheets API is enabled in Google Cloud Console.'
    ];
  } else if (statusCode === 404) {
    userError = 'Spreadsheet or sheet not found';
    solutions = [
      'Verify SPREADSHEET_ID in Vercel is correct.',
      'Check if sheet name exists in your spreadsheet.'
    ];
  } else if (statusCode === 429) {
    userError = 'Too many requests to Google Sheets API';
    solutions = ['Reduce request frequency or increase Google Cloud quota.'];
  }

  return res.status(statusCode).json({
    error: userError,
    details: details,
    solutions: solutions,
    timestamp: new Date().toISOString()
  });
}
