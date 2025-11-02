import { google } from 'googleapis';
import { tokenManager } from './tokenManager.js';
import { retryWithExponentialBackoff, handleGoogleApiError } from '../utils/googleApiHelper.js';

/**
 * Get authenticated Drive client for a user
 */
async function getDriveClient(userId) {
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
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * List Drive files
 */
export async function listFiles(userId, options = {}) {
  try {
    const drive = await getDriveClient(userId);
    
    const { maxResults = 20, query, orderBy = 'modifiedTime desc' } = options;
    
    const response = await drive.files.list({
      pageSize: maxResults,
      q: query || 'trashed=false',
      orderBy,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink)',
    });
    
    return response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
    }));
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Drive access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Drive access denied. Please grant Drive permissions in Settings.');
    }
    throw new Error(`Drive API error: ${error.message}`);
  }
}

/**
 * Search for files
 */
export async function searchFiles(userId, searchTerm, options = {}) {
  try {
    const drive = await getDriveClient(userId);
    
    const { maxResults = 10, mimeType } = options;
    
    // Escape single quotes in search term to prevent query injection
    const escapedSearchTerm = searchTerm.replace(/'/g, "\\'");
    
    let query = `name contains '${escapedSearchTerm}' and trashed=false`;
    if (mimeType) {
      query += ` and mimeType='${mimeType}'`;
    }
    
    const response = await drive.files.list({
      pageSize: maxResults,
      q: query,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
    });
    
    return response.data.files;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Drive access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Drive access denied. Please grant Drive permissions in Settings.');
    }
    throw new Error(`Drive API error: ${error.message}`);
  }
}

/**
 * Share a file with someone
 */
export async function shareFile(userId, fileId, email, role = 'reader') {
  try {
    const drive = await getDriveClient(userId);
    
    const permission = {
      type: 'user',
      role, // reader, writer, commenter
      emailAddress: email,
    };
    
    await drive.permissions.create({
      fileId,
      resource: permission,
      sendNotificationEmail: true,
    });
    
    // Get file info
    const file = await drive.files.get({
      fileId,
      fields: 'id, name, webViewLink',
    });
    
    return {
      success: true,
      file: file.data,
      sharedWith: email,
      role,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Drive access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Drive access denied or file sharing not allowed.');
    }
    if (error.response?.status === 404) {
      throw new Error('File not found.');
    }
    throw new Error(`Drive API error: ${error.message}`);
  }
}

/**
 * Delete a file
 */
export async function deleteFile(userId, fileId) {
  try {
    const drive = await getDriveClient(userId);
    
    await drive.files.delete({ fileId });
    
    return { success: true, fileId };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Drive access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Drive access denied or insufficient permissions to delete file.');
    }
    if (error.response?.status === 404) {
      throw new Error('File not found. It may have already been deleted.');
    }
    throw new Error(`Drive API error: ${error.message}`);
  }
}
