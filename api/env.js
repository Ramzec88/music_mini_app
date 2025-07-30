export default async function handler(req) {
  return new Response(
    JSON.stringify({
      GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
      GOOGLE_SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
