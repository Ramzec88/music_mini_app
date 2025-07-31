import { google } from 'googleapis';

// Parse JSON from GOOGLE_PRIVATE_KEY
const credentials = JSON.parse(process.env.GOOGLE_PRIVATE_KEY);
const privateKey = credentials.private_key.replace(/\\n/g, '\n');
const clientEmail = credentials.email; // Use 'email' field instead of 'client_email' for some environments

const auth = new google.auth.JWT(
  clientEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, sheetName, range, values, searchValue, updateRange, updateValue, cell, newValue, rowIndex, updates } = req.body;
    
    console.log('📝 API Request:', { 
      action, sheetName, range, values, searchValue, updateRange, updateValue, cell, newValue, rowIndex, updates,
      timestamp: new Date().toISOString()
    });

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
        if (!sheetName) {
          return res.status(400).json({ error: 'Missing required parameter: sheetName for get action' });
        }
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
        if (!sheetName || searchValue === undefined) { 
          return res.status(400).json({ error: 'Missing required parameters: sheetName or searchValue for find action' });
        }
        const searchRange = sheetName; 

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: searchRange, 
          });
          
          const rows = response.data.values || [];
          
          const normalizedSearchValue = String(searchValue).trim().toLowerCase();
          const foundRow = rows.find((row) => 
            row[0] && String(row[0]).trim().toLowerCase() === normalizedSearchValue
          );
          
          if (foundRow) {
            const rowIndex = rows.indexOf(foundRow) + 1;
            console.log('✅ FIND result: found at row', rowIndex, 'with data:', foundRow);
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
        if (!sheetName || !values) {
          return res.status(400).json({ error: 'Missing required parameters: sheetName or values for append action' });
        }
        
        // Ensure values is an array of arrays, as required by the Sheets API
        const appendValues = Array.isArray(values) && Array.isArray(values[0]) ? values : [values];

        try {
          const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName, // Use sheetName directly for appending to the end
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
        if (!sheetName || !cell || newValue === undefined) {
          return res.status(400).json({ error: 'Missing required parameters: sheetName, cell, or newValue for update action' });
        }
        const targetRange = `${sheetName}!${cell}`;

        try {
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: targetRange,
            valueInputOption: 'RAW',
            resource: {
              values: [[newValue]],
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
        if (!sheetName || !rowIndex || !updates) {
            return res.status(400).json({ error: 'Missing required parameters: sheetName, rowIndex, or updates for updateRow action' });
        }
        try {
            // Fetch the existing row to update specific cells
            const existingRowResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
            });
            
            let existingRow = existingRowResponse.data.values ? existingRowResponse.data.values[0] : [];
            
            // Apply updates
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

      default:
        console.error('❌ Invalid action:', action);
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
  } catch (error) {
    console.error('❌ General API Error in handler:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.stack });
  }
}

function handleGoogleApiError(error, res) {
  let statusCode = 500;
  let userError = 'Internal Google Sheets API error';
  let details = error.message;

  if (error.response && error.response.status) {
    statusCode = error.response.status;
    if (error.response.data && error.response.data.error) {
      details = error.response.data.error.message;
    }
  }
  
  if (statusCode === 403) {
    userError = 'Access denied to Google Sheet';
  } else if (statusCode === 404) {
    userError = 'Spreadsheet or sheet not found';
  }

  return res.status(statusCode).json({
    error: userError,
    details: details,
    solutions: [],
    timestamp: new Date().toISOString()
  });
}
