/**
 * UI Functions for OpenAI Function Calling
 * Defines all available UI actions that the AI can execute
 */

export const UI_FUNCTIONS = [
  {
    name: 'changeModel',
    description: 'Switch AI model. Only when user explicitly requests model change.',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          enum: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'auto'],
        },
      },
      required: ['model'],
    },
  },
  {
    name: 'createNewChat',
    description: 'Create new conversation.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Chat title',
        },
      },
      required: [],
    },
  },
  {
    name: 'renameConversation',
    description: 'Rename current chat.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'New title',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'deleteConversation',
    description: 'Delete current chat.',
    parameters: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Confirmation that the user wants to delete (always true when calling)',
        },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a different page in the application. Use this when the user wants to go to admin panel, settings, or other pages.',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['chat', 'admin', 'login'],
          description: 'The page to navigate to',
        },
      },
      required: ['page'],
    },
  },
  {
    name: 'webSearch',
    description: 'Search the web for current information, news, facts, or real-time data. Use this when you need to answer questions about recent events, current statistics, live data, or information that changes frequently. Examples: "Who won the 2024 Super Bowl?", "What is the current weather in New York?", "Latest news about AI", "Current stock price of Apple". DO NOT use for general knowledge questions you already know.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web',
        },
        numResults: {
          type: 'number',
          description: 'Number of search results to return (default: 5, max: 10)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'readEmails',
    description: 'Read emails from the user\'s Gmail inbox. Use this when the user asks to check emails, read messages, show inbox, or wants to see their recent emails.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Number of emails to retrieve (default: 10, max: 50)',
          default: 10,
        },
        query: {
          type: 'string',
          description: 'Optional search query (e.g., "from:example@gmail.com", "is:unread", "subject:important")',
        },
      },
      required: [],
    },
  },
  {
    name: 'searchEmails',
    description: 'Search for specific emails in Gmail. Use this when the user wants to find emails matching certain criteria.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "from:john@example.com", "subject:meeting", "has:attachment newer_than:7d")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'sendEmail',
    description: 'Send an email via Gmail. Use this when the user asks to send an email, compose a message, or write to someone.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Plain text email body',
        },
        html: {
          type: 'string',
          description: 'Optional HTML email body (if formatting is needed)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'markEmailAsRead',
    description: 'Mark an email as read in Gmail. Use this when the user wants to mark a message as read.',
    parameters: {
      type: 'object',
      properties: {
        emailId: {
          type: 'string',
          description: 'ID of the email to mark as read',
        },
      },
      required: ['emailId'],
    },
  },
  {
    name: 'archiveEmail',
    description: 'Archive Gmail (admin).',
    parameters: {
      type: 'object',
      properties: {
        emailId: {
          type: 'string',
          description: 'ID of the email to archive',
        },
      },
      required: ['emailId'],
    },
  },
  {
    name: 'deleteEmail',
    description: 'Delete Gmail (admin).',
    parameters: {
      type: 'object',
      properties: {
        emailId: {
          type: 'string',
          description: 'ID of the email to delete',
        },
      },
      required: ['emailId'],
    },
  },
  // Google Calendar Functions
  {
    name: 'listCalendarEvents',
    description: 'List Calendar events.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of events to retrieve (default: 10)',
          default: 10,
        },
        timeMin: {
          type: 'string',
          description: 'Start time for events (ISO 8601 format, e.g., "2024-01-01T00:00:00Z"). Defaults to now.',
        },
        timeMax: {
          type: 'string',
          description: 'End time for events (ISO 8601 format). Optional.',
        },
      },
      required: [],
    },
  },
  {
    name: 'createCalendarEvent',
    description: 'Create Calendar event.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Event title/summary',
        },
        description: {
          type: 'string',
          description: 'Event description (optional)',
        },
        startTime: {
          type: 'string',
          description: 'Event start time (ISO 8601 format, e.g., "2024-01-01T10:00:00Z")',
        },
        endTime: {
          type: 'string',
          description: 'Event end time (ISO 8601 format)',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of attendee email addresses (optional)',
        },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
  },
  {
    name: 'deleteCalendarEvent',
    description: 'Delete Calendar event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'ID of the event to delete',
        },
      },
      required: ['eventId'],
    },
  },
  // Google Drive Functions
  {
    name: 'listDriveFiles',
    description: 'List Drive files.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of files to retrieve (default: 20)',
          default: 20,
        },
        query: {
          type: 'string',
          description: 'Search query (e.g., "name contains \'report\'", "mimeType=\'application/pdf\'")',
        },
        orderBy: {
          type: 'string',
          description: 'Sort order (e.g., "modifiedTime desc", "name")',
        },
      },
      required: [],
    },
  },
  {
    name: 'searchDriveFiles',
    description: 'Search Drive files.',
    parameters: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Search term to look for in file names',
        },
        mimeType: {
          type: 'string',
          description: 'Filter by file type (e.g., "application/pdf", "image/jpeg", "application/vnd.google-apps.document")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
          default: 10,
        },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'shareDriveFile',
    description: 'Share Drive file.',
    parameters: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'ID of the file to share',
        },
        email: {
          type: 'string',
          description: 'Email address of the person to share with',
        },
        role: {
          type: 'string',
          enum: ['reader', 'writer', 'commenter'],
          description: 'Permission level (reader, writer, or commenter)',
          default: 'reader',
        },
      },
      required: ['fileId', 'email'],
    },
  },
  {
    name: 'deleteDriveFile',
    description: 'Delete Drive file.',
    parameters: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'ID of the file to delete',
        },
      },
      required: ['fileId'],
    },
  },
  // Google Docs Functions
  {
    name: 'createGoogleDoc',
    description: 'Create a new Google Doc. Use this when the user wants to create a document, start writing, or make a new doc.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the new document',
        },
        content: {
          type: 'string',
          description: 'Initial content for the document (optional)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'readGoogleDoc',
    description: 'Read the content of a Google Doc. Use this when the user wants to see what\'s in a document or retrieve doc content.',
    parameters: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'ID of the document to read',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'updateGoogleDoc',
    description: 'Update or append content to a Google Doc. Use this when the user wants to edit, add text to, or modify a document.',
    parameters: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'ID of the document to update',
        },
        content: {
          type: 'string',
          description: 'Content to append to the document',
        },
      },
      required: ['documentId', 'content'],
    },
  },
  // Google Sheets Functions
  {
    name: 'createGoogleSheet',
    description: 'Create a new Google Sheet. Use this when the user wants to create a spreadsheet, make a new sheet, or start a new workbook.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the new spreadsheet',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'readGoogleSheet',
    description: 'Read data from a Google Sheet. Use this when the user wants to see spreadsheet data or retrieve sheet values.',
    parameters: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'ID of the spreadsheet to read',
        },
        range: {
          type: 'string',
          description: 'Range to read (e.g., "Sheet1!A1:D10", "Sheet1")',
        },
      },
      required: ['spreadsheetId', 'range'],
    },
  },
  {
    name: 'updateGoogleSheet',
    description: 'Update cells in a Google Sheet. Use this when the user wants to edit, modify, or write data to a spreadsheet.',
    parameters: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'ID of the spreadsheet to update',
        },
        range: {
          type: 'string',
          description: 'Range to update (e.g., "Sheet1!A1:B2")',
        },
        values: {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          description: '2D array of values to write (e.g., [["Name", "Age"], ["John", "30"]])',
        },
      },
      required: ['spreadsheetId', 'range', 'values'],
    },
  },
  {
    name: 'appendToGoogleSheet',
    description: 'Append a new row to a Google Sheet. Use this when the user wants to add data, insert a row, or log information to a spreadsheet.',
    parameters: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'ID of the spreadsheet',
        },
        range: {
          type: 'string',
          description: 'Range where to append (e.g., "Sheet1!A:D")',
        },
        values: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of values to append as a new row (e.g., ["John", "30", "Engineer"])',
        },
      },
      required: ['spreadsheetId', 'range', 'values'],
    },
  },
];

/**
 * Get function definition by name
 */
export function getFunctionByName(name) {
  return UI_FUNCTIONS.find(fn => fn.name === name);
}

/**
 * Execute a UI function
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Function arguments
 * @param {Object} context - Execution context (user, conversation, etc.)
 * @returns {Promise<Object>} - Result of execution
 */
export async function executeUIFunction(functionName, args, context) {
  const { conversationId, userId } = context;
  
  if (functionName === 'webSearch') {
    const { performWebSearch, logSearchUsage } = await import('./webSearch.js');
    
    try {
      const searchResults = await performWebSearch(args.query, args.numResults || 5);
      
      await logSearchUsage(userId, args.query, searchResults.results.length, conversationId);
      
      return {
        success: true,
        message: `Found ${searchResults.results.length} results for "${args.query}"`,
        data: searchResults,
      };
    } catch (error) {
      return {
        success: false,
        message: `Web search failed: ${error.message}`,
        data: null,
      };
    }
  }
  
  // Gmail functions - users can access their own Gmail via OAuth
  const gmailFunctions = ['readEmails', 'searchEmails', 'sendEmail', 'markEmailAsRead', 'archiveEmail', 'deleteEmail'];
  if (gmailFunctions.includes(functionName)) {
    if (!context.user) {
      return {
        success: false,
        message: 'You must be logged in to access Gmail',
        data: null,
      };
    }
    // Note: Users access their own Gmail via their connected Google OAuth account
  }
  
  if (functionName === 'readEmails' || functionName === 'searchEmails') {
    const { listEmails, searchEmails } = await import('./gmail.js');
    
    try {
      const emails = functionName === 'readEmails' 
        ? await listEmails(context.user.id, { maxResults: args.maxResults || 10, query: args.query || '' })
        : await searchEmails(context.user.id, args.query, args.maxResults || 10);
      
      return {
        success: true,
        message: `Found ${emails.length} email(s)`,
        data: { emails },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to read emails: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'sendEmail') {
    const { sendEmail } = await import('./gmail.js');
    
    try {
      const result = await sendEmail(context.user.id, args);
      
      return {
        success: true,
        message: `Email sent successfully to ${args.to}`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send email: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'markEmailAsRead') {
    const { markAsRead } = await import('./gmail.js');
    
    try {
      await markAsRead(context.user.id, args.emailId);
      
      return {
        success: true,
        message: 'Email marked as read',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to mark as read: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'archiveEmail') {
    const { archiveEmail } = await import('./gmail.js');
    
    try {
      await archiveEmail(context.user.id, args.emailId);
      
      return {
        success: true,
        message: 'Email archived successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to archive email: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'deleteEmail') {
    const { deleteEmail } = await import('./gmail.js');
    
    try {
      await deleteEmail(context.user.id, args.emailId);
      
      return {
        success: true,
        message: 'Email deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete email: ${error.message}`,
        data: null,
      };
    }
  }
  
  // Google Calendar Functions
  const calendarFunctions = ['listCalendarEvents', 'createCalendarEvent', 'deleteCalendarEvent'];
  if (calendarFunctions.includes(functionName)) {
    if (!context.user) {
      return { success: false, message: 'You must be logged in to access Calendar', data: null };
    }
  }
  
  if (functionName === 'listCalendarEvents') {
    const { listEvents } = await import('./googleCalendar.js');
    try {
      const events = await listEvents(context.user.id, args);
      return { success: true, message: `Found ${events.length} event(s)`, data: { events } };
    } catch (error) {
      return { success: false, message: `Failed to list events: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'createCalendarEvent') {
    const { createEvent } = await import('./googleCalendar.js');
    try {
      const event = await createEvent(context.user.id, args);
      return { success: true, message: `Event "${args.summary}" created successfully`, data: event };
    } catch (error) {
      return { success: false, message: `Failed to create event: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'deleteCalendarEvent') {
    const { deleteEvent } = await import('./googleCalendar.js');
    try {
      await deleteEvent(context.user.id, args.eventId);
      return { success: true, message: 'Event deleted successfully', data: null };
    } catch (error) {
      return { success: false, message: `Failed to delete event: ${error.message}`, data: null };
    }
  }
  
  // Google Drive Functions
  const driveFunctions = ['listDriveFiles', 'searchDriveFiles', 'shareDriveFile', 'deleteDriveFile'];
  if (driveFunctions.includes(functionName)) {
    if (!context.user) {
      return { success: false, message: 'You must be logged in to access Drive', data: null };
    }
  }
  
  if (functionName === 'listDriveFiles') {
    const { listFiles } = await import('./googleDrive.js');
    try {
      const files = await listFiles(context.user.id, args);
      return { success: true, message: `Found ${files.length} file(s)`, data: { files } };
    } catch (error) {
      return { success: false, message: `Failed to list files: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'searchDriveFiles') {
    const { searchFiles } = await import('./googleDrive.js');
    try {
      const files = await searchFiles(context.user.id, args.searchTerm, args);
      return { success: true, message: `Found ${files.length} file(s) matching "${args.searchTerm}"`, data: { files } };
    } catch (error) {
      return { success: false, message: `Failed to search files: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'shareDriveFile') {
    const { shareFile } = await import('./googleDrive.js');
    try {
      const result = await shareFile(context.user.id, args.fileId, args.email, args.role);
      return { success: true, message: `File shared with ${args.email}`, data: result };
    } catch (error) {
      return { success: false, message: `Failed to share file: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'deleteDriveFile') {
    const { deleteFile } = await import('./googleDrive.js');
    try {
      await deleteFile(context.user.id, args.fileId);
      return { success: true, message: 'File deleted successfully', data: null };
    } catch (error) {
      return { success: false, message: `Failed to delete file: ${error.message}`, data: null };
    }
  }
  
  // Google Docs Functions
  const docsFunctions = ['createGoogleDoc', 'readGoogleDoc', 'updateGoogleDoc'];
  if (docsFunctions.includes(functionName)) {
    if (!context.user) {
      return { success: false, message: 'You must be logged in to access Docs', data: null };
    }
  }
  
  if (functionName === 'createGoogleDoc') {
    const { createDocument } = await import('./googleDocs.js');
    try {
      const doc = await createDocument(context.user.id, args.title, args.content);
      return { success: true, message: `Document "${args.title}" created successfully`, data: doc };
    } catch (error) {
      return { success: false, message: `Failed to create document: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'readGoogleDoc') {
    const { readDocument } = await import('./googleDocs.js');
    try {
      const doc = await readDocument(context.user.id, args.documentId);
      return { success: true, message: `Retrieved document "${doc.title}"`, data: doc };
    } catch (error) {
      return { success: false, message: `Failed to read document: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'updateGoogleDoc') {
    const { updateDocument } = await import('./googleDocs.js');
    try {
      const result = await updateDocument(context.user.id, args.documentId, args.content);
      return { success: true, message: 'Document updated successfully', data: result };
    } catch (error) {
      return { success: false, message: `Failed to update document: ${error.message}`, data: null };
    }
  }
  
  // Google Sheets Functions
  const sheetsFunctions = ['createGoogleSheet', 'readGoogleSheet', 'updateGoogleSheet', 'appendToGoogleSheet'];
  if (sheetsFunctions.includes(functionName)) {
    if (!context.user) {
      return { success: false, message: 'You must be logged in to access Sheets', data: null };
    }
  }
  
  if (functionName === 'createGoogleSheet') {
    const { createSpreadsheet } = await import('./googleSheets.js');
    try {
      const sheet = await createSpreadsheet(context.user.id, args.title);
      return { success: true, message: `Spreadsheet "${args.title}" created successfully`, data: sheet };
    } catch (error) {
      return { success: false, message: `Failed to create spreadsheet: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'readGoogleSheet') {
    const { readSheet } = await import('./googleSheets.js');
    try {
      const data = await readSheet(context.user.id, args.spreadsheetId, args.range);
      return { success: true, message: `Retrieved data from range ${args.range}`, data };
    } catch (error) {
      return { success: false, message: `Failed to read spreadsheet: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'updateGoogleSheet') {
    const { updateSheet } = await import('./googleSheets.js');
    try {
      const result = await updateSheet(context.user.id, args.spreadsheetId, args.range, args.values);
      return { success: true, message: `Updated ${result.updatedCells} cell(s)`, data: result };
    } catch (error) {
      return { success: false, message: `Failed to update spreadsheet: ${error.message}`, data: null };
    }
  }
  
  if (functionName === 'appendToGoogleSheet') {
    const { appendToSheet } = await import('./googleSheets.js');
    try {
      const result = await appendToSheet(context.user.id, args.spreadsheetId, args.range, args.values);
      return { success: true, message: `Appended row successfully`, data: result };
    } catch (error) {
      return { success: false, message: `Failed to append to spreadsheet: ${error.message}`, data: null };
    }
  }
  
  const { ActionExecutor } = await import('./actionExecutor.js');
  
  // Map function calls to UI actions
  const actionMap = {
    changeModel: 'changeModel',
    createNewChat: 'createNewChat',
    renameConversation: 'renameConversation',
    deleteConversation: 'deleteConversation',
    navigate: 'navigate',
  };
  
  const actionType = actionMap[functionName];
  
  if (!actionType) {
    throw new Error(`Unknown function: ${functionName}`);
  }
  
  // Build action parameters
  let actionParams = { ...args };
  
  // Add conversationId for conversation-specific actions
  if (['renameConversation', 'deleteConversation'].includes(functionName)) {
    actionParams.conversationId = conversationId;
  }
  
  // Execute the action using the static method
  const result = await ActionExecutor.executeAction(actionType, actionParams, userId);
  
  return {
    success: result.success,
    message: result.message || `Successfully executed ${functionName}`,
    data: result.result,
  };
}

export default {
  UI_FUNCTIONS,
  getFunctionByName,
  executeUIFunction,
};
