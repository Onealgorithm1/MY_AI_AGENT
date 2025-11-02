import { google } from 'googleapis';
import { tokenManager } from './tokenManager.js';

/**
 * Get authenticated Docs client for a user
 */
async function getDocsClient(userId) {
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
  
  return google.docs({ version: 'v1', auth: oauth2Client });
}

/**
 * Get Drive client (needed for creating docs)
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
 * Create a new Google Doc
 */
export async function createDocument(userId, title, content = '') {
  try {
    const docs = await getDocsClient(userId);
    
    // Create document
    const createResponse = await docs.documents.create({
      requestBody: {
        title,
      },
    });
    
    const documentId = createResponse.data.documentId;
    
    // If content provided, add it
    if (content) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: content,
              },
            },
          ],
        },
      });
    }
    
    return {
      documentId,
      title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Docs access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Docs access denied. Please grant Docs permissions in Settings.');
    }
    throw new Error(`Docs API error: ${error.message}`);
  }
}

/**
 * Read a Google Doc
 */
export async function readDocument(userId, documentId) {
  try {
    const docs = await getDocsClient(userId);
    
    const response = await docs.documents.get({ documentId });
    
    // Extract text content
    let text = '';
    if (response.data.body?.content) {
      for (const element of response.data.body.content) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content) {
              text += elem.textRun.content;
            }
          }
        }
      }
    }
    
    return {
      documentId: response.data.documentId,
      title: response.data.title,
      content: text,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Docs access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Docs access denied or insufficient permissions.');
    }
    if (error.response?.status === 404) {
      throw new Error('Document not found.');
    }
    throw new Error(`Docs API error: ${error.message}`);
  }
}

/**
 * Update (append to) a Google Doc
 */
export async function updateDocument(userId, documentId, content) {
  try {
    const docs = await getDocsClient(userId);
    
    // Get document to find end index
    const doc = await docs.documents.get({ documentId });
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;
    
    // Append content
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: endIndex,
              },
              text: '\n' + content,
            },
          },
        ],
      },
    });
    
    return {
      documentId,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
      success: true,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Docs access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Docs access denied or insufficient permissions to edit.');
    }
    if (error.response?.status === 404) {
      throw new Error('Document not found.');
    }
    throw new Error(`Docs API error: ${error.message}`);
  }
}
