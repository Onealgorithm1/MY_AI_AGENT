import { google } from 'googleapis';

let connectionSettings = null;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Gmail connection not available - X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected. Please connect your Gmail account.');
  }
  return accessToken;
}

export async function getGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function parseEmailBody(payload) {
  let body = '';
  
  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const nestedBody = parseEmailBody(part);
        if (nestedBody) body += nestedBody;
      }
    }
  }
  
  return body;
}

export async function listEmails(options = {}) {
  try {
    const gmail = await getGmailClient();
    const {
      maxResults = 20,
      query = '',
      labelIds = ['INBOX']
    } = options;

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
      labelIds
    });

    const messages = response.data.messages || [];
    
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        try {
          return await getEmailDetails(msg.id);
        } catch (error) {
          console.error(`Error fetching email ${msg.id}:`, error.message);
          return null;
        }
      })
    );

    return emailDetails.filter(email => email !== null);
  } catch (error) {
    console.error('Error listing emails:', error.message);
    throw new Error(`Failed to list emails: ${error.message}`);
  }
}

export async function getEmailDetails(messageId) {
  try {
    const gmail = await getGmailClient();

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = response.data;
    const headers = message.payload.headers;
    
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const body = parseEmailBody(message.payload);

    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      to,
      date,
      snippet: message.snippet,
      body: body.substring(0, 5000),
      labelIds: message.labelIds,
      isUnread: message.labelIds?.includes('UNREAD') || false
    };
  } catch (error) {
    console.error('Error getting email details:', error.message);
    throw new Error(`Failed to get email: ${error.message}`);
  }
}

export async function sendEmail(options) {
  try {
    const gmail = await getGmailClient();
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

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    };
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function markAsRead(messageId) {
  try {
    const gmail = await getGmailClient();

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

export async function markAsUnread(messageId) {
  try {
    const gmail = await getGmailClient();

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

export async function archiveEmail(messageId) {
  try {
    const gmail = await getGmailClient();

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

export async function deleteEmail(messageId) {
  try {
    const gmail = await getGmailClient();

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

export async function searchEmails(query, maxResults = 20) {
  return await listEmails({ query, maxResults });
}

export async function getUnreadCount() {
  try {
    const gmail = await getGmailClient();

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

export async function checkGmailConnection() {
  try {
    await getAccessToken();
    return { connected: true };
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
