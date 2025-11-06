import { google } from 'googleapis';
import tokenManager from './tokenManager.js';
import { retryWithExponentialBackoff, handleGoogleApiError } from '../utils/googleApiHelper.js';
import { convert } from 'html-to-text';

export async function getGmailClient(userId) {
  if (!userId) {
    throw new Error('User ID is required for Gmail access');
  }

  const accessToken = await tokenManager.getValidToken(userId, 'google');
  
  if (!accessToken) {
    throw new Error('Gmail not connected. Please connect your Google account in Settings.');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function cleanUrl(url) {
  try {
    const urlObj = new URL(url);
    const tracking = ['utm_', 'track', 'ref', 'fbclid', 'gclid', 'mc_', 'lipi', 'mid', 'trk', 'eid', 'otpToken'];
    
    tracking.forEach(param => {
      const keysToDelete = [];
      for (const [key] of urlObj.searchParams) {
        if (key.toLowerCase().includes(param.toLowerCase())) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => urlObj.searchParams.delete(key));
    });
    
    const cleanedUrl = urlObj.toString();
    if (cleanedUrl.length > 80) {
      return urlObj.hostname + urlObj.pathname.substring(0, 30) + '...';
    }
    return cleanedUrl;
  } catch (e) {
    return url.length > 80 ? url.substring(0, 80) + '...' : url;
  }
}

function parseEmailBody(payload) {
  let plainText = '';
  let htmlText = '';
  
  function extractContent(part) {
    if (part.body?.data) {
      const content = Buffer.from(part.body.data, 'base64').toString('utf-8');
      
      if (part.mimeType === 'text/plain') {
        plainText += content;
      } else if (part.mimeType === 'text/html') {
        htmlText += content;
      }
    }
    
    if (part.parts) {
      part.parts.forEach(extractContent);
    }
  }
  
  extractContent(payload);
  
  if (htmlText) {
    const cleanText = convert(htmlText, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'a', format: 'anchor', options: { ignoreHref: false, noAnchorUrl: false, hideLinkHrefIfSameAsText: true } },
        { selector: 'img', format: 'skip' },
        { selector: 'table', options: { uppercaseHeaderCells: false } }
      ],
      longWordSplit: {
        wrapCharacters: [],
        forceWrapOnLimit: false
      }
    });
    
    return {
      text: cleanText,
      html: htmlText,
      isHtml: true
    };
  }
  
  return {
    text: plainText,
    html: null,
    isHtml: false
  };
}

export async function listEmails(userId, options = {}) {
  try {
    const gmail = await getGmailClient(userId);
    const {
      maxResults = 20,
      query = '',
      labelIds = ['INBOX'],
      autoAnalyze = true
    } = options;

    const response = await retryWithExponentialBackoff(async () => {
      return await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
        labelIds
      });
    });

    const messages = response.data.messages || [];
    
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        try {
          return await getEmailDetails(userId, msg.id);
        } catch (error) {
          console.error(`Error fetching email ${msg.id}:`, error.message);
          return null;
        }
      })
    );

    const filteredEmails = emailDetails.filter(email => email !== null);

    if (autoAnalyze && filteredEmails.length > 0) {
      (async () => {
        try {
          const { queueEmailForAnalysis } = await import('./emailCategorization.js');
          for (const email of filteredEmails) {
            await queueEmailForAnalysis(userId, email).catch(err => {
              console.error(`Failed to queue email ${email.id}:`, err.message);
            });
          }
        } catch (error) {
          console.error('Email auto-analysis queueing error:', error);
        }
      })();
    }

    return filteredEmails;
  } catch (error) {
    console.error('Error listing emails:', error.message);
    handleGoogleApiError(error, 'Gmail');
  }
}

export async function getEmailDetails(userId, messageId) {
  try {
    const gmail = await getGmailClient(userId);

    const response = await retryWithExponentialBackoff(async () => {
      return await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
    });

    const message = response.data;
    const headers = message.payload.headers;
    
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const parsedBody = parseEmailBody(message.payload);

    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      to,
      date,
      snippet: message.snippet,
      body: parsedBody.text || '(No content)',
      bodyHtml: parsedBody.html,
      isHtml: parsedBody.isHtml,
      labelIds: message.labelIds,
      isUnread: message.labelIds?.includes('UNREAD') || false
    };
  } catch (error) {
    console.error('Error getting email details:', error.message);
    handleGoogleApiError(error, 'Gmail');
  }
}

export async function sendEmail(userId, options) {
  try {
    const gmail = await getGmailClient(userId);
    const { to, subject, body, html } = options;

    if (!to || !subject) {
      throw new Error('Recipient (to) and subject are required');
    }

    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      html ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
      '',
      html || body || ''
    ].join('\n');

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await retryWithExponentialBackoff(async () => {
      return await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
    });

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    };
  } catch (error) {
    console.error('Error sending email:', error.message);
    handleGoogleApiError(error, 'Gmail');
  }
}

export async function markAsRead(userId, messageId) {
  try {
    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking email as read:', error.message);
    throw new Error(`Failed to mark as read: ${error.message}`);
  }
}

export async function markAsUnread(userId, messageId) {
  try {
    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: ['UNREAD']
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking email as unread:', error.message);
    throw new Error(`Failed to mark as unread: ${error.message}`);
  }
}

export async function archiveEmail(userId, messageId) {
  try {
    const gmail = await getGmailClient(userId);

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX']
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error archiving email:', error.message);
    throw new Error(`Failed to archive email: ${error.message}`);
  }
}

export async function deleteEmail(userId, messageId) {
  try {
    const gmail = await getGmailClient(userId);

    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting email:', error.message);
    throw new Error(`Failed to delete email: ${error.message}`);
  }
}

export async function searchEmails(userId, query, maxResults = 20) {
  return await listEmails(userId, { query, maxResults });
}

export async function getUnreadCount(userId) {
  try {
    const gmail = await getGmailClient(userId);

    const response = await gmail.users.labels.get({
      userId: 'me',
      id: 'INBOX'
    });

    return {
      unreadCount: response.data.messagesUnread || 0,
      totalCount: response.data.messagesTotal || 0
    };
  } catch (error) {
    console.error('Error getting unread count:', error.message);
    throw new Error(`Failed to get unread count: ${error.message}`);
  }
}

export async function checkGmailConnection(userId) {
  try {
    const hasToken = await tokenManager.hasValidToken(userId, 'google');
    return { connected: hasToken };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export default {
  getGmailClient,
  listEmails,
  getEmailDetails,
  sendEmail,
  searchEmails,
  markAsRead,
  markAsUnread,
  archiveEmail,
  deleteEmail,
  getUnreadCount,
  checkGmailConnection
};
