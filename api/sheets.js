// api/sheets.js - Финальная версия с надежной обработкой приватного ключа
// Для работы требуется установить пакеты: google-auth-library и googleapis
// npm install google-auth-library googleapis

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

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
    const { action, sheetName, range, values, searchValue, updateRange, updateValue } = req.body;
    
    // Получаем переменные окружения для СЕРВИСНОГО АККАУНТА
    const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // Приватный ключ теперь ожидается как строка с экранированными \\n
    const PRIVATE_KEY_ESCAPED = process.env.GOOGLE_PRIVATE_KEY_BASE64; // Используем то же имя переменной
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    
    console.log('📝 API Request:', { 
      action, 
      sheetName, 
      hasClientEmail: !!CLIENT_EMAIL, 
      hasPrivateKeyEscaped: !!PRIVATE_KEY_ESCAPED, // Проверяем наличие переменной
      hasSpreadsheetId: !!SPREADSHEET_ID,
      timestamp: new Date().toISOString()
    });
    
    if (!CLIENT_EMAIL || !PRIVATE_KEY_ESCAPED || !SPREADSHEET_ID) {
      console.error('❌ Missing environment variables for Service Account');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY_BASE64, or GOOGLE_SPREADSHEET_ID',
        solution: 'Add environment variables in Vercel Dashboard for Service Account authentication'
      });
    }

    // Восстанавливаем приватный ключ из экранированной строки
    // Заменяем \\n на реальные \n
    const fullPrivateKey = PRIVATE_KEY_ESCAPED.replace(/\\n/g, '\n');

    // Инициализация аутентификации через Сервисный аккаунт
    const auth = new GoogleAuth({
      credentials: {
        client_email: CLIENT_EMAIL,
        private_key: fullPrivateKey, 
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Область доступа для чтения и записи
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    switch (action) {
      case 'get':
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}${range ? '!' + range : ''}`,
          });
          
          console.log('✅ GET response successful:', { 
            range: response.data.range, 
            rowCount: response.data.values ? response.data.values.length : 0 
          });
          return res.json(response.data);
          
        } catch (error) {
          console.error('GET Error:', error);
          return handleGoogleApiError(error, res);
        }

      case 'append':
        try {
          const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
            valueInputOption: 'RAW',
            resource: {
              values: [values],
            },
          });
          
          console.log('✅ APPEND response successful:', response.data);
          return res.json(response.data);
          
        } catch (error) {
          console.error('APPEND Error:', error);
          return handleGoogleApiError(error, res);
        }

      case 'update':
        try {
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!${updateRange}`,
            valueInputOption: 'RAW',
            resource: {
              values: [[updateValue]],
            },
          });
          
          console.log('✅ UPDATE response successful:', response.data);
          return res.json(response.data);
          
        } catch (error) {
          console.error('UPDATE Error:', error);
          return handleGoogleApiError(error, res);
        }

      case 'find':
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName, // Получаем все данные с листа для поиска
          });
          
          const rows = response.data.values;
          if (rows) {
            for (let i = 0; i < rows.length; i++) {
              if (rows[i][0] === searchValue) { // Ищем только в первом столбце
                console.log('✅ FIND result: found at row', i + 1);
                return res.json({
                  found: true,
                  rowIndex: i + 1,
                  rowData: rows[i]
                });
              }
            }
          }
          
          console.log('❌ FIND result: not found');
          return res.json({ found: false });
          
        } catch (error) {
          console.error('FIND Error:', error);
          return handleGoogleApiError(error, res);
        }

      case 'test-write-permissions':
        try {
          // Пытаемся записать тестовое значение в фиктивную ячейку
          const testRange = `${sheetName || 'Users'}!Z1000`; // Используем лист Users или любой другой
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
          
          return res.json({
            canRead: true, // Если можем записать, то и читать можем
            canWrite: true,
            writeError: null,
            recommendations: ['Write permissions are working correctly with Service Account.']
          });

        } catch (error) {
          console.error('TEST-WRITE-PERMISSIONS Error:', error);
          let writeErrorDetails = 'Unknown error';
          if (error.response && error.response.data && error.response.data.error) {
            writeErrorDetails = error.response.data.error.message;
          } else if (error.message) {
            writeErrorDetails = error.message;
          }
          
          return res.json({
            canRead: true, // Предполагаем, что чтение работает, т.к. ошибка только при записи
            canWrite: false,
            writeError: writeErrorDetails,
            recommendations: [
              'Share the Google Sheet with the Service Account email (Editor role).',
              'Ensure Google Sheets API is enabled in Google Cloud Console.',
              'Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY_BASE64 in Vercel environment variables.'
            ]
          });
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
    
    if (error.message.includes('GOOGLE_PRIVATE_KEY_BASE64') || error.message.includes('GOOGLE_SERVICE_ACCOUNT_EMAIL')) {
      userError = 'Server configuration error: Service Account credentials missing';
      solutions = ['Ensure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY_BASE64 are set correctly in Vercel Environment Variables.'];
    } else if (error.message.includes('401')) { 
      userError = 'Authentication failed with Google Sheets API (Service Account)';
      statusCode = 401;
      solutions = [
        'Check if Service Account email is correct',
        'Verify private key is correctly formatted (especially newlines or Base64 encoding)',
        'Ensure Google Sheets API is enabled'
      ];
    } else if (error.message.includes('403')) {
      userError = 'Access denied to Google Sheets (Service Account)';
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
      'Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY_BASE64 in Vercel variables.',
      'Ensure private key is correctly formatted (Base64 encoded).'
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
