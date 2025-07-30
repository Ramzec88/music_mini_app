export default async function handler(request) {
  // Проверяем метод запроса
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
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
      
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error: Missing environment variables',
          GOOGLE_SHEETS_API_KEY: '',
          GOOGLE_SPREADSHEET_ID: ''
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        GOOGLE_SHEETS_API_KEY: apiKey,
        GOOGLE_SPREADSHEET_ID: spreadsheetId,
        status: 'success'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );

  } catch (error) {
    console.error('API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        GOOGLE_SHEETS_API_KEY: '',
        GOOGLE_SPREADSHEET_ID: ''
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
