// api/sheets.js
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
    
    // Получаем переменные окружения (БЕЗ VITE_ префикса для серверных функций)
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    
    console.log('📝 API Request:', { action, sheetName, hasApiKey: !!API_KEY, hasSpreadsheetId: !!SPREADSHEET_ID });
    
    if (!API_KEY || !SPREADSHEET_ID) {
      console.error('❌ Missing environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing API_KEY or SPREADSHEET_ID'
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
            throw new Error(`Google Sheets API error: ${getResponse.status}`);
          }
          
          const getData = await getResponse.json();
          console.log('✅ GET response:', getData);
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
            throw new Error(`Google Sheets API error: ${appendResponse.status}`);
          }
          
          const appendData = await appendResponse.json();
          console.log('✅ APPEND response:', appendData);
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
            throw new Error(`Google Sheets API error: ${updateResponse.status}`);
          }
          
          const updateData = await updateResponse.json();
          console.log('✅ UPDATE response:', updateData);
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

      default:
        console.error('❌ Invalid action:', action);
        return res.status(400).json({ error: 'Invalid action', validActions: ['get', 'append', 'update', 'find'] });
    }
  } catch (error) {
    console.error('❌ General API Error:', error);
    
    // Определяем тип ошибки для пользователя
    let userError = 'Internal server error';
    let statusCode = 500;
    
    if (error.message.includes('403')) {
      userError = 'API key access denied. Check permissions.';
      statusCode = 403;
    } else if (error.message.includes('404')) {
      userError = 'Spreadsheet not found. Check SPREADSHEET_ID.';
      statusCode = 404;
    } else if (error.message.includes('400')) {
      userError = 'Invalid request to Google Sheets API.';
      statusCode = 400;
    } else if (error.message.includes('Failed to fetch')) {
      userError = 'Cannot connect to Google Sheets API.';
      statusCode = 502;
    }
    
    return res.status(statusCode).json({ 
      error: userError,
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
