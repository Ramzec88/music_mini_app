import { google } from 'googleapis';

// Парсим JSON из GOOGLE_PRIVATE_KEY
const credentials = JSON.parse(process.env.GOOGLE_PRIVATE_KEY);

// Преобразуем ключ с экранированными \\n в настоящий \n
const privateKey = credentials.private_key.replace(/\\n/g, '\n');
const clientEmail = credentials.client_email || credentials.email; // Поддержка разных форматов

// Инициализация аутентификации JWT
const auth = new google.auth.JWT(
  clientEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);

// Инициализация клиента Google Sheets API
const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  // Разрешаем CORS для всех источников
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
    const { 
      action, 
      sheetName, 
      range, 
      values, 
      searchValue, 
      updateRange, 
      updateValue, 
      cell, 
      newValue, 
      rowIndex, 
      updates 
    } = req.body;
    
    // Логирование входящего запроса
    console.log('📝 API Request:', { 
      action, 
      sheetName, 
      range, 
      searchValue, 
      updateRange, 
      updateValue,
      cell,
      newValue,
      rowIndex,
      updates,
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
        if (!sheetName || searchValue === undefined) {
          return res.status(400).json({ error: 'Missing required parameters: sheetName or searchValue for find action' });
        }
        
        // Для поиска берем весь лист, чтобы получить полные данные строки
        const searchRange = sheetName; 

        try {
          console.log('🔍 Поиск в листе:', sheetName, 'значение:', searchValue);
          
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: searchRange, 
          });
          
          const rows = response.data.values || [];
          console.log('📋 Получено строк:', rows.length);
          
          if (rows.length > 0) {
            console.log('📄 Первые 3 строки:', rows.slice(0, 3));
          }
          
          // Нормализуем поисковое значение
          const normalizedSearchValue = String(searchValue).trim().toLowerCase();
          console.log('🔄 Ищем нормализованное значение:', normalizedSearchValue);

          const foundRow = rows.find((row, index) => {
            const cellValue = row[0]; // Ищем в первом столбце
            const normalizedCellValue = cellValue ? String(cellValue).trim().toLowerCase() : '';
            console.log(`Строка ${index + 1}: "${cellValue}" -> "${normalizedCellValue}" (совпадает: ${normalizedCellValue === normalizedSearchValue})`);
            return normalizedCellValue === normalizedSearchValue;
          });
          
          if (foundRow) {
            const rowIndex = rows.indexOf(foundRow) + 1; // Получаем 1-основанный индекс строки
            console.log('✅ FIND result: found at row', rowIndex, 'with data:', foundRow);
            return res.status(200).json({ found: true, rowIndex: rowIndex, rowData: foundRow });
          } else {
            console.log('❌ FIND result: not found among', rows.length, 'rows');
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
        
        // Обрабатываем values - должен быть массивом массивов
        let appendValues;
        if (Array.isArray(values)) {
          // Если это уже массив массивов, используем как есть
          if (Array.isArray(values[0])) {
            appendValues = values;
          } else {
            // Если это просто массив, оборачиваем в массив
            appendValues = [values];
          }
        } else {
          // Если это строка, разбиваем по запятым и оборачиваем
          appendValues = [values.split(',').map(s => s.trim())];
        }

        console.log('📤 Добавляем данные:', appendValues);

        try {
          const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName, // Добавляем в конец листа
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
              values: appendValues,
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
        // Поддерживаем два формата параметров для обратной совместимости
        let targetCell, targetValue;
        
        if (cell && newValue !== undefined) {
          // Новый формат: cell + newValue
          targetCell = cell;
          targetValue = newValue;
        } else if (updateRange && updateValue !== undefined) {
          // Старый формат: updateRange + updateValue
          targetCell = updateRange;
          targetValue = updateValue;
        } else {
          return res.status(400).json({ 
            error: 'Missing required parameters for update action. Need either (cell + newValue) or (updateRange + updateValue)' 
          });
        }

        if (!sheetName) {
          return res.status(400).json({ error: 'Missing required parameter: sheetName for update action' });
        }
        
        const targetRange = `${sheetName}!${targetCell}`;
        console.log('🔄 Обновляем ячейку:', targetRange, 'значение:', targetValue);

        try {
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: targetRange,
            valueInputOption: 'RAW',
            resource: {
              values: [[targetValue]], // Оборачиваем в массив для обновления одной ячейки
            },
          });
          console.log('✅ UPDATE response successful:', response.data);
          return res.status(200).json(response.data);
        } catch (error) {
          console.error('UPDATE Error:', error);
          return handleGoogleApiError(error, res);
        }
      }

      case 'updateRow': {
        // Обновление нескольких ячеек в строке
        if (!sheetName || !rowIndex || !updates) {
          return res.status(400).json({ 
            error: 'Missing required parameters: sheetName, rowIndex, or updates for updateRow action' 
          });
        }
        
        console.log('🔄 Обновляем строку:', rowIndex, 'обновления:', updates);
        
        try {
          // Получаем существующую строку
          const existingRowResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
          });
          
          let existingRow = existingRowResponse.data.values ? existingRowResponse.data.values[0] : [];
          
          // Применяем обновления
          for (const colIndex in updates) {
            if (updates.hasOwnProperty(colIndex)) {
              existingRow[colIndex] = updates[colIndex];
            }
          }

          const updateRange = `${sheetName}!A${rowIndex}`;
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'RAW',
            resource: {
              values: [existingRow],
            },
          });
          console.log('✅ UPDATE ROW response successful:', response.data);
          return res.status(200).json(response.data);

        } catch (error) {
          console.error('UPDATE ROW Error:', error);
          return handleGoogleApiError(error, res);
        }
      }

      case 'test-write-permissions': {
        // Этот action используется для проверки прав записи
        if (!sheetName) {
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

          // Очищаем тестовую ячейку
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
          
          return res.status(403).json({
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

      case 'debug-promo': {
        // Специальный action для отладки промокодов
        const { testPromoCode } = req.body;
        
        if (!testPromoCode) {
          return res.status(400).json({ error: 'Missing testPromoCode parameter' });
        }
        
        try {
          console.log('🔧 DEBUG: Проверяем промокод', testPromoCode);
          
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'PromoCodes!A1:G20', // Получаем первые 20 строк со всеми данными
          });
          
          const rows = response.data.values || [];
          console.log('🔧 DEBUG: Получено строк:', rows.length);
          
          const normalizedSearch = String(testPromoCode).trim().toLowerCase();
          
          const foundRow = rows.find((row, index) => {
            const code = row[0];
            const normalizedCode = code ? String(code).trim().toLowerCase() : '';
            console.log(`🔧 DEBUG Строка ${index + 1}:`, {
              original: code,
              normalized: normalizedCode,
              matches: normalizedCode === normalizedSearch,
              status: row[1],
              fullRow: row
            });
            return normalizedCode === normalizedSearch;
          });
          
          return res.status(200).json({
            debug: true,
            searchValue: testPromoCode,
            normalizedSearch: normalizedSearch,
            totalRows: rows.length,
            allRows: rows,
            foundRow: foundRow,
            foundIndex: foundRow ? rows.indexOf(foundRow) + 1 : -1,
            analysis: foundRow ? {
              code: foundRow[0],
              status: foundRow[1],
              statusTrimmed: foundRow[1] ? String(foundRow[1]).trim() : null,
              statusLength: foundRow[1] ? foundRow[1].length : 0,
              uses: foundRow[3],
              maxUses: foundRow[4]
            } : null
          });
          
        } catch (error) {
          console.error('🔧 DEBUG Error:', error);
          return res.status(500).json({ 
            debug: true,
            error: error.message,
            stack: error.stack
          });
        }
      }

      default:
        console.error('❌ Invalid action:', action);
        return res.status(400).json({ 
          error: 'Invalid action', 
          validActions: ['get', 'append', 'update', 'updateRow', 'find', 'test-write-permissions', 'debug-promo'],
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
