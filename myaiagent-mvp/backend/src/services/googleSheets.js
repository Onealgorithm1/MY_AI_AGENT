import { google } from 'googleapis';
import { tokenManager } from './tokenManager.js';
import { retryWithExponentialBackoff, handleGoogleApiError } from '../utils/googleApiHelper.js';

/**
 * Get authenticated Sheets client for a user
 */
async function getSheetsClient(userId) {
  const tokens = await tokenManager.getValidTokens(userId);
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

/**
 * Create a new Google Sheet
 */
export async function createSpreadsheet(userId, title) {
  try {
    const sheets = await getSheetsClient(userId);
    
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });
    
    return {
      spreadsheetId: response.data.spreadsheetId,
      title: response.data.properties.title,
      url: response.data.spreadsheetUrl,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Sheets access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Sheets access denied. Please grant Sheets permissions in Settings.');
    }
    throw new Error(`Sheets API error: ${error.message}`);
  }
}

/**
 * Read data from a Google Sheet
 */
export async function readSheet(userId, spreadsheetId, range) {
  try {
    const sheets = await getSheetsClient(userId);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    return {
      spreadsheetId,
      range: response.data.range,
      values: response.data.values || [],
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Sheets access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Sheets access denied or insufficient permissions.');
    }
    if (error.response?.status === 404) {
      throw new Error('Spreadsheet not found.');
    }
    throw new Error(`Sheets API error: ${error.message}`);
  }
}

/**
 * Update cells in a Google Sheet
 */
export async function updateSheet(userId, spreadsheetId, range, values) {
  try {
    const sheets = await getSheetsClient(userId);
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    
    return {
      spreadsheetId,
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      updatedCells: response.data.updatedCells,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Sheets access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Sheets access denied or insufficient permissions to edit.');
    }
    if (error.response?.status === 404) {
      throw new Error('Spreadsheet not found.');
    }
    throw new Error(`Sheets API error: ${error.message}`);
  }
}

/**
 * Append a row to a Google Sheet
 */
export async function appendToSheet(userId, spreadsheetId, range, values) {
  try {
    const sheets = await getSheetsClient(userId);
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values], // Wrap in array to create a single row
      },
    });
    
    return {
      spreadsheetId,
      updatedRange: response.data.updates.updatedRange,
      updatedRows: response.data.updates.updatedRows,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Sheets access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Sheets access denied or insufficient permissions to edit.');
    }
    if (error.response?.status === 404) {
      throw new Error('Spreadsheet not found.');
    }
    throw new Error(`Sheets API error: ${error.message}`);
  }
}
