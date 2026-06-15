import { google } from "googleapis";

const SPREADSHEET_ID = "1ZIQarA4gq_VJO9N6x_hQ-2Z0lqwoF2vrVXQ2kmfflzA";

export async function appendToSheet(data: {
  name: string;
  email: string;
  country: string;
  dateTime: string;
}) {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("Missing Google Sheets credentials");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const values = [
    [
      data.name,
      data.email,
      data.country,
      data.dateTime,
    ],
  ];

  const resource = {
    values,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!A:D",
    valueInputOption: "USER_ENTERED",
    requestBody: resource,
  });

  return { success: true };
}
