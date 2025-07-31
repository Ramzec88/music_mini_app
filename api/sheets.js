// api/sheets.js - Улучшенная версия с обработкой ошибки 401
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
    
    // Получаем переменные окружения
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    
    console.log('📝 API Request:', { 
      action, 
      sheetName, 
      hasApiKey: !!API_KEY, 
      hasSpreadsheetId: !!SPREADSHEET_ID,
      timestamp: new Date().toISOString()
    });
    
    if (!API_KEY || !SPREADSHEET_ID) {
      console.error('❌ Missing environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SPREADSHEET_ID',
        solution: 'Add environment variables in Vercel Dashboard'
      });
    }

    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

    switch (action) {
      case 'get':
        try {
          const getUrl = `${baseUrl}/values/${sheetName}${range ? '!' + range : ''}?key=${API_KEY}`;
          console.log('📡 GET request to:', getUrl);
          
          const getResponse = await fetch(getUrl);
          
          if (!getResponse.ok) {
            const errorText = await getResponse.text();
            console.error('Google Sheets API Error:', getResponse.status, errorText);
            
            // Подробная обработка ошибок
            if (getResponse.status === 401) {
              return res.status(401).json({
                error: 'API key authentication failed',
                details: 'The API key is invalid or expired',
                solutions: [
                  'Check if the API key is correct in Vercel environment variables',
                  'Verify that Google Sheets API is enabled in Google Cloud Console',
                  'Make sure the API key has proper restrictions set'
                ]
              });
            } else if (getResponse.status === 403) {
              return res.status(403).json({
                error: 'Access forbidden to Google Sheets',
                details: 'No permission to access the spreadsheet',
                solutions: [
                  'Make the spreadsheet publicly readable',
                  'Share the spreadsheet with the service account email',
                  'Check API key restrictions in Google Cloud Console'
                ]
              });
            } else if (getResponse.status === 404) {
              return res.status(404).json({
                error: 'Spreadsheet or sheet not found',
                details: `Sheet "${sheetName}" not found in spreadsheet`,
                solutions: [
                  'Check if SPREADSHEET_ID is correct',
                  'Verify that the sheet name exists in your spreadsheet',
                  'Make sure the spreadsheet is not deleted'
                ]
              });
            }
            
            throw new Error(`Google Sheets API error: ${getResponse.status}`);
          }
          
          const getData = await getResponse.json();
          console.log('✅ GET response successful:', { 
            range: getData.range, 
            rowCount: getData.values ? getData.values.length : 0 
          });
          return res.json(getData);
          
        } catch (error) {
          console.error('GET Error:', error);
          throw error;
        }

      case 'append':
        try {
          const appendUrl = `${baseUrl}/values/${sheetName}:append?valueInputOption=RAW&key=${API_KEY}`;
          console.log('📡 APPEND request to:', appendUrl);
          console.log('📝 APPEND data:', values);
          
          const appendResponse = await fetch(appendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [values] })
          });
          
          if (!appendResponse.ok) {
            const errorText = await appendResponse.text();
            console.error('Google Sheets API Error:', appendResponse.status, errorText);
            
            // Специальная обработка ошибки 401 для записи
            if (appendResponse.status === 401) {
              return res.status(401).json({
                error: 'API key has no write permissions',
                details: 'The API key can read but cannot write to Google Sheets',
                solutions: [
                  'Make the spreadsheet publicly editable (Anyone with link can edit)',
                  'Use a Service Account instead of API key for write operations',
                  'Share the spreadsheet with edit permissions',
                  'Check if the API key has proper scopes for writing'
                ],
                readOnlyMode: true
              });
            }
            
            throw new Error(`Google Sheets API error: ${appendResponse.status}`);
          }
          
          const appendData = await appendResponse.json();
          console.log('✅ APPEND response successful:', appendData);
          return res.json(appendData);
          
        } catch (error) {
          console.error('APPEND Error:', error);
          throw error;
        }

      case 'update':
        try {
          const updateUrl = `${baseUrl}/values/${sheetName}!${updateRange}?valueInputOption=RAW&key=${API_KEY}`;
          console.log('📡 UPDATE request to:', updateUrl);
          console.log('📝 UPDATE data:', updateValue);
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[updateValue]] })
          });
          
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Google Sheets API Error:', updateResponse.status, errorText);
            
            if (updateResponse.status === 401) {
              return res.status(401).json({
                error: 'API key has no write permissions',
                details: 'Cannot update cells - write access required',
                solutions: [
                  'Enable edit permissions for the spreadsheet',
                  'Use Service Account authentication',
                  'Grant write access to the API key'
                ]
              });
            }
            
            throw new Error(`Google Sheets API error: ${updateResponse.status}`);
          }
          
          const updateData = await updateResponse.json();
          console.log('✅ UPDATE response successful:', updateData);
          return res.json(updateData);
          
        } catch (error) {
          console.error('UPDATE Error:', error);
          throw error;
        }

      case 'find':
        try {
          const findUrl = `${baseUrl}/values/${sheetName}?key=${API_KEY}`;
          console.log('📡 FIND request to:', findUrl);
          console.log('🔍 Searching for:', searchValue);
          
          const findResponse = await fetch(findUrl);
          
          if (!findResponse.ok) {
            const errorText = await findResponse.text();
            console.error('Google Sheets API Error:', findResponse.status, errorText);
            throw new Error(`Google Sheets API error: ${findResponse.status}`);
          }
          
          const findData = await findResponse.json();
          
          if (findData.values) {
            for (let i = 0; i < findData.values.length; i++) {
              if (findData.values[i][0] === searchValue) {
                console.log('✅ FIND result: found at row', i + 1);
                return res.json({
                  found: true,
                  rowIndex: i + 1,
                  rowData: findData.values[i]
                });
              }
            }
          }
          
          console.log('❌ FIND result: not found');
          return res.json({ found: false });
          
        } catch (error) {
          console.error('FIND Error:', error);
          throw error;
        }

      // Специальный action для проверки прав записи
      case 'test-write-permissions':
        try {
          // Пытаемся прочитать небольшой диапазон
          const testReadUrl = `${baseUrl}/values/${sheetName || 'Users'}!A1:A1?key=${API_KEY}`;
          const readResponse = await fetch(testReadUrl);
          
          if (!readResponse.ok) {
            throw new Error(`Read test failed: ${readResponse.status}`);
          }

          // Пытаемся записать тестовое значение (которое сразу же удалим)
          const testWriteUrl = `${baseUrl}/values/${sheetName || 'Users'}!Z1000?valueInputOption=RAW&key=${API_KEY}`;
          const writeResponse = await fetch(testWriteUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [['test']] })
          });

          const canWrite = writeResponse.ok;
          
          return res.json({
            canRead: true,
            canWrite: canWrite,
            writeError: canWrite ? null : writeResponse.status,
            recommendations: canWrite ? 
              ['Write permissions are working correctly'] : 
              [
                'Enable public edit access for the spreadsheet',
                'Share spreadsheet with edit permissions',
                'Consider using Service Account authentication'
              ]
          });

        } catch (error) {
          return res.json({
            canRead: false,
            canWrite: false,
            error: error.message,
            recommendations: [
              'Check API key validity',
              'Verify spreadsheet exists and is accessible',
              'Ensure Google Sheets API is enabled'
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
    console.error('❌ General API Error:', error);
    
    // Определяем тип ошибки для пользователя
    let userError = 'Internal server error';
    let statusCode = 500;
    let solutions = [];
    
    if (error.message.includes('401')) {
      userError = 'Authentication failed with Google Sheets API';
      statusCode = 401;
      solutions = [
        'Check if API key is valid and not expired',
        'Verify Google Sheets API is enabled',
        'For write operations, ensure proper permissions are set'
      ];
    } else if (error.message.includes('403')) {
      userError = 'Access denied to Google Sheets';
      statusCode = 403;
      solutions = [
        'Make spreadsheet publicly accessible',
        'Share spreadsheet with appropriate permissions',
        'Check API key restrictions'
      ];
    } else if (error.message.includes('404')) {
      userError = 'Spreadsheet or sheet not found';
      statusCode = 404;
      solutions = [
        'Verify SPREADSHEET_ID is correct',
        'Check if sheet names exist in spreadsheet',
        'Ensure spreadsheet is not deleted'
      ];
    } else if (error.message.includes('Failed to fetch')) {
      userError = 'Cannot connect to Google Sheets API';
      statusCode = 502;
      solutions = [
        'Check internet connectivity',
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
