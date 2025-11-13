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
    description: 'Search the web for current information, news, facts, statistics, or real-time data. ALWAYS use this function when the user asks questions containing keywords like: "search", "look up", "find", "current", "latest", "today", "now", "recent", "what is happening", or when asking about events after 2023, prices, weather, sports scores, news, or anything time-sensitive. Examples: "Who won the 2024 Super Bowl?", "Search for latest AI news", "What is the current weather?", "Find information about...", "Look up stock prices", "Latest updates on...". If the user explicitly asks you to search or if the information might be outdated, you MUST use this function.',
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
    name: 'getPerformanceMetrics',
    description: 'Query your own infrastructure performance metrics in real-time. Use this to check API response times, external service latency, system health, and overall operational performance. Call this when you want to understand how fast/slow you are responding, diagnose performance issues, or proactively inform users about service delays.',
    parameters: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          description: 'Time range to analyze (e.g., "1 hour", "6 hours", "24 hours", "7 days")',
          default: '1 hour',
        },
      },
      required: [],
    },
  },
  {
    name: 'queryPerformanceMetrics',
    description: 'Drill down into specific performance metrics with detailed data points. Use this when you need granular performance data for a specific metric (like API latency, Gemini response times, database query times, etc.). This provides time-series data for in-depth analysis.',
    parameters: {
      type: 'object',
      properties: {
        metricName: {
          type: 'string',
          description: 'Name of the metric to query (e.g., "api_latency", "external_api_latency", "db_query_time")',
        },
        timeRange: {
          type: 'string',
          description: 'Time range to query (e.g., "1 hour", "24 hours")',
          default: '1 hour',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of data points to return',
          default: 100,
        },
      },
      required: ['metricName'],
    },
  },
  {
    name: 'detectPerformanceAnomalies',
    description: 'Detect performance anomalies and issues in your infrastructure. Use this to identify spikes, sustained increases, statistical outliers, or unusual patterns in a specific metric. This helps you diagnose problems before users complain.',
    parameters: {
      type: 'object',
      properties: {
        metricName: {
          type: 'string',
          description: 'Metric to analyze for anomalies (e.g., "api_latency", "external_api_latency")',
        },
        timeRange: {
          type: 'string',
          description: 'Time range to analyze for anomalies',
          default: '1 hour',
        },
      },
      required: ['metricName'],
    },
  },
  {
    name: 'getActiveAnomalies',
    description: 'Get all currently active performance anomalies across all metrics. Use this to see if there are any ongoing performance issues, service degradations, or system problems that might be affecting user experience.',
    parameters: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          description: 'Time range to check for anomalies',
          default: '24 hours',
        },
        minSeverity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Minimum severity level to include',
          default: 'low',
        },
      },
      required: [],
    },
  },
  {
    name: 'readEmails',
    description: 'Read emails from the user\'s Gmail inbox and list them as summaries. Use this when the user wants to see a LIST of emails (subjects, senders). For showing the FULL CONTENT of a specific email, use getEmailDetails instead.',
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
    name: 'presentLatestEmail',
    description: 'Retrieve and present the user\'s most recent email in a beautifully formatted email viewer. Use this when the user asks to "show me my latest email", "present my last email", "display my most recent email", or "read my newest email". This function retrieves the email and automatically outputs it using the PRESENT_EMAIL protocol for formatted display. DO NOT call readEmails first - this function does everything in one step.',
    parameters: {
      type: 'object',
      properties: {},
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
  {
    name: 'getEmailDetails',
    description: 'Get complete details of a specific email including subject, sender, recipients, date, and full body content. Use this when the user wants to "show", "present", "display", or "read" a specific email in full detail. WORKFLOW: (1) Call readEmails/searchEmails to get email IDs, (2) Call this function with an emailId from step 1, (3) Immediately output PRESENT_EMAIL protocol JSON with the returned data. Example: User says "show me my latest email" → readEmails → getEmailDetails(emailId) → output: {"presentation_protocol":"PRESENT_EMAIL","email":{data from this function}}. CRITICAL: After calling this function, you MUST use the PRESENT_EMAIL protocol to display the email beautifully formatted.',
    parameters: {
      type: 'object',
      properties: {
        emailId: {
          type: 'string',
          description: 'ID of the email to retrieve (obtained from readEmails or searchEmails)',
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
  // SAM.gov Functions
  {
    name: 'searchSAMGov',
    description: 'Search the SAM.gov database for federal contractors and government entities. Use this when the user provides a specific company name, UEI number, CAGE code, or DBA name. If the user asks a vague question like "find contractors", ask them to specify: (1) Company name or identifier, or (2) What type of contractor/industry they are looking for. Only search when you have at least one specific search criterion.',
    parameters: {
      type: 'object',
      properties: {
        ueiSAM: {
          type: 'string',
          description: 'Unique Entity Identifier (UEI) SAM - 12-character alphanumeric code',
        },
        legalBusinessName: {
          type: 'string',
          description: 'Legal business name of the entity to search for (must be specific)',
        },
        dbaName: {
          type: 'string',
          description: 'Doing Business As (DBA) name',
        },
        cageCode: {
          type: 'string',
          description: 'Commercial and Government Entity (CAGE) code (5-character alphanumeric)',
        },
      },
      required: [],
    },
  },
  {
    name: 'getSAMGovEntityDetails',
    description: 'Get comprehensive details for a specific SAM.gov entity by UEI, including full registration data, certifications, points of contact, and representations. Use this when the user wants complete information about a specific entity, not just basic search results. Examples: "Get full details for UEI [number]", "Show me everything about this contractor", "What certifications does this company have?".',
    parameters: {
      type: 'object',
      properties: {
        ueiSAM: {
          type: 'string',
          description: 'Unique Entity Identifier (UEI) SAM - 12-character alphanumeric code',
        },
      },
      required: ['ueiSAM'],
    },
  },
  {
    name: 'searchSAMGovOpportunities',
    description: 'Search federal contract opportunities and procurement notices. Asks user for keywords/industry to narrow the search. If no date range is specified, automatically searches the last 30 days. You can optionally ask about date range preferences, but it will default to recent opportunities. Focus on getting a good keyword from the user. IMPORTANT: Extract the PRIMARY keyword from user queries - use single words or simple terms, not full phrases. Examples: "salesforce consulting" → use "salesforce", "cybersecurity services" → use "cybersecurity", "cloud computing infrastructure" → use "cloud".',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Primary keyword to search in opportunity titles. Use a SINGLE WORD or simple term, not a full phrase. Extract the main topic from user query. Examples: "salesforce" (not "salesforce consulting"), "cybersecurity" (not "cybersecurity services"), "cloud" (not "cloud computing"). The API searches opportunity titles for this keyword.',
        },
        postedFrom: {
          type: 'string',
          description: 'Start date for opportunities (MM/dd/yyyy format, e.g., 10/13/2025). Optional - defaults to 30 days ago.',
        },
        postedTo: {
          type: 'string',
          description: 'End date for opportunities (MM/dd/yyyy format, e.g., 11/12/2025). Optional - defaults to today.',
        },
      },
      required: [],
    },
  },
  {
    name: 'getSAMGovExclusions',
    description: 'Search for excluded/debarred entities in SAM.gov. Use this when the user wants to check if a company or individual is barred from federal contracting. Examples: "Is [company] debarred?", "Check exclusions for UEI [number]", "Find excluded contractors", "Is this entity on the exclusion list?".',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Entity name to search for exclusions',
        },
        ueiSAM: {
          type: 'string',
          description: 'UEI SAM to check for exclusions',
        },
        cageCode: {
          type: 'string',
          description: 'CAGE code to check for exclusions',
        },
      },
      required: [],
    },
  },
  // Internal Opportunity Management Functions
  {
    name: 'createOpportunity',
    description: 'Save a SAM.gov opportunity to the internal tracking system. Use this when the user wants to track, save, qualify, or work on a federal contract opportunity. This starts the internal workflow (New → Qualified → In Progress → Submitted → Won/Lost). The user will then be able to assign it, score it, and track progress.',
    parameters: {
      type: 'object',
      properties: {
        noticeId: {
          type: 'string',
          description: 'Unique SAM.gov notice ID from the opportunity',
        },
        solicitationNumber: {
          type: 'string',
          description: 'Solicitation number',
        },
        title: {
          type: 'string',
          description: 'Opportunity title',
        },
        type: {
          type: 'string',
          description: 'Opportunity type (e.g., "Presolicitation", "Combined Synopsis/Solicitation")',
        },
        postedDate: {
          type: 'string',
          description: 'Posted date (ISO 8601 format)',
        },
        responseDeadline: {
          type: 'string',
          description: 'Response deadline (ISO 8601 format)',
        },
        description: {
          type: 'string',
          description: 'Opportunity description',
        },
        naicsCode: {
          type: 'string',
          description: 'NAICS code',
        },
        setAsideType: {
          type: 'string',
          description: 'Set-aside type (e.g., "Small Business", "8(a)", "WOSB")',
        },
        contractingOffice: {
          type: 'string',
          description: 'Contracting office name',
        },
        placeOfPerformance: {
          type: 'string',
          description: 'Place of performance location',
        },
        initialStatus: {
          type: 'string',
          enum: ['New', 'Qualified'],
          description: 'Initial status for the opportunity (default: New)',
        },
        initialScore: {
          type: 'number',
          description: 'Initial qualification score 0-100 (optional)',
        },
        initialNotes: {
          type: 'string',
          description: 'Initial notes about the opportunity (optional)',
        },
      },
      required: ['noticeId', 'title'],
    },
  },
  {
    name: 'listOpportunities',
    description: 'List opportunities from the internal tracking system with filtering options. Use this when the user wants to see opportunities, check pipeline status, view assigned opportunities, or get opportunity counts. Examples: "Show me our opportunities", "What opportunities are assigned to me?", "List qualified opportunities", "Show high-scoring opportunities".',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['New', 'Qualified', 'In Progress', 'Submitted', 'Won', 'Lost', 'Archived'],
          description: 'Filter by internal status',
        },
        assignedTo: {
          type: 'string',
          description: 'Filter by assigned user: "me" for current user, "unassigned" for unassigned, or specific user ID',
        },
        minScore: {
          type: 'number',
          description: 'Filter by minimum qualification score (0-100)',
        },
        search: {
          type: 'string',
          description: 'Search in opportunity title and description',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          default: 20,
        },
      },
      required: [],
    },
  },
  {
    name: 'getOpportunityDetails',
    description: 'Get full details of a specific opportunity including activity history. Use this when the user asks for more information about a specific opportunity, wants to see the full details, or wants to check the status history.',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: {
          type: 'number',
          description: 'ID of the opportunity to retrieve',
        },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'updateOpportunityStatus',
    description: 'Update the workflow status of an opportunity. Use this when the user wants to move an opportunity through the pipeline: New → Qualified → In Progress → Submitted → Won/Lost. Examples: "Mark opportunity #5 as qualified", "Move this to in progress", "We won this contract", "This opportunity was lost".',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: {
          type: 'number',
          description: 'ID of the opportunity to update',
        },
        status: {
          type: 'string',
          enum: ['New', 'Qualified', 'In Progress', 'Submitted', 'Won', 'Lost', 'Archived'],
          description: 'New status for the opportunity',
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the status change',
        },
      },
      required: ['opportunityId', 'status'],
    },
  },
  {
    name: 'assignOpportunity',
    description: 'Assign an opportunity to a team member or unassign it. Use this when the user wants to assign work, delegate an opportunity, or take ownership. Examples: "Assign this to me", "Give opportunity #3 to Sarah", "Unassign this opportunity".',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: {
          type: 'number',
          description: 'ID of the opportunity to assign',
        },
        userId: {
          type: 'string',
          description: 'UUID of the user to assign to, or null to unassign. Use "me" to assign to current user.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the assignment',
        },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'updateOpportunityScore',
    description: 'Update the internal qualification score for an opportunity (0-100). Use this when the user evaluates, rates, or scores an opportunity. Higher scores indicate better fit. Examples: "Score this 85", "Rate opportunity #2 as 70", "This looks like a 90".',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: {
          type: 'number',
          description: 'ID of the opportunity to score',
        },
        score: {
          type: 'number',
          description: 'Qualification score from 0-100',
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the scoring rationale',
        },
      },
      required: ['opportunityId', 'score'],
    },
  },
  {
    name: 'addOpportunityNotes',
    description: 'Add or update notes on an opportunity. Use this when the user wants to document information, add comments, record meeting notes, or update opportunity details. Examples: "Add a note to opportunity #5", "Note that we need technical lead approval", "Update notes with client feedback".',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: {
          type: 'number',
          description: 'ID of the opportunity',
        },
        notes: {
          type: 'string',
          description: 'Notes to add or update',
        },
        append: {
          type: 'boolean',
          description: 'If true, append to existing notes. If false, replace notes. Default: true',
          default: true,
        },
      },
      required: ['opportunityId', 'notes'],
    },
  },
  {
    name: 'getOpportunityStats',
    description: 'Get summary statistics about opportunities in the pipeline. Use this when the user wants dashboard metrics, pipeline overview, or status counts. Examples: "Show me our pipeline stats", "How many opportunities do we have?", "What\'s our win rate?", "Pipeline summary".',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Optional: filter stats to specific user (use "me" for current user)',
        },
      },
      required: [],
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
 * Helper function to get JWT token for internal API calls
 */
async function getUserToken(userId) {
  try {
    const { query } = await import('../utils/database.js');
    const { generateToken } = await import('../utils/auth.js');

    // Get user details from database
    const result = await query('SELECT id, email, role FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    return generateToken(user);
  } catch (error) {
    console.error('Error generating user token:', error);
    throw error;
  }
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

  if (functionName === 'searchSAMGov') {
    const { searchEntities } = await import('./samGov.js');

    try {
      const searchParams = {
        ueiSAM: args.ueiSAM,
        legalBusinessName: args.legalBusinessName,
        dbaName: args.dbaName,
        cageCode: args.cageCode,
      };

      const result = await searchEntities(searchParams, userId);

      // Format entity details for presentation
      let message = `Found ${result.totalRecords} SAM.gov ${result.totalRecords === 1 ? 'entity' : 'entities'}`;

      if (result.entities && result.entities.length > 0) {
        const entityDetails = result.entities.map(entity => {
          const coreData = entity.coreData || {};
          const entityRegistration = entity.entityRegistration || {};

          return {
            legalBusinessName: coreData.legalBusinessName || 'N/A',
            dbaName: coreData.dbaName || 'N/A',
            ueiSAM: coreData.ueiSAM || 'N/A',
            cageCode: coreData.cageCode || 'N/A',
            physicalAddress: coreData.physicalAddress || {},
            registrationStatus: entityRegistration.registrationStatus || 'N/A',
            registrationDate: entityRegistration.registrationDate || 'N/A',
            expirationDate: entityRegistration.expirationDate || 'N/A',
          };
        });

        message += '\n\nEntity Details:\n' + entityDetails.map((e, i) =>
          `${i + 1}. ${e.legalBusinessName}\n` +
          `   UEI: ${e.ueiSAM}\n` +
          `   CAGE Code: ${e.cageCode}\n` +
          `   DBA: ${e.dbaName}\n` +
          `   Status: ${e.registrationStatus}\n` +
          `   Registration Date: ${e.registrationDate}\n` +
          `   Expiration Date: ${e.expirationDate}\n` +
          (e.physicalAddress.addressLine1 ? `   Address: ${e.physicalAddress.addressLine1}, ${e.physicalAddress.city || ''}, ${e.physicalAddress.stateOrProvinceCode || ''} ${e.physicalAddress.zipCode || ''}` : '')
        ).join('\n\n');
      }

      return {
        success: true,
        message: message,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `SAM.gov search failed: ${error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'getSAMGovEntityDetails') {
    const { getEntityByUEI } = await import('./samGov.js');

    try {
      const result = await getEntityByUEI(args.ueiSAM, userId);

      if (result.success && result.entity) {
        const entity = result.entity;
        const coreData = entity.coreData || {};
        const entityRegistration = entity.entityRegistration || {};
        const pointsOfContact = entity.pointsOfContact || [];

        let message = `Full details for ${coreData.legalBusinessName || 'Entity'}\n\n`;
        message += `📋 Basic Information:\n`;
        message += `   Legal Business Name: ${coreData.legalBusinessName || 'N/A'}\n`;
        message += `   DBA Name: ${coreData.dbaName || 'N/A'}\n`;
        message += `   UEI: ${coreData.ueiSAM || 'N/A'}\n`;
        message += `   CAGE Code: ${coreData.cageCode || 'N/A'}\n`;
        message += `   Entity Type: ${coreData.entityStructureCode || 'N/A'}\n\n`;

        message += `📅 Registration Status:\n`;
        message += `   Status: ${entityRegistration.registrationStatus || 'N/A'}\n`;
        message += `   Registration Date: ${entityRegistration.registrationDate || 'N/A'}\n`;
        message += `   Expiration Date: ${entityRegistration.expirationDate || 'N/A'}\n\n`;

        if (coreData.physicalAddress) {
          message += `📍 Physical Address:\n`;
          message += `   ${coreData.physicalAddress.addressLine1 || ''}\n`;
          if (coreData.physicalAddress.addressLine2) message += `   ${coreData.physicalAddress.addressLine2}\n`;
          message += `   ${coreData.physicalAddress.city || ''}, ${coreData.physicalAddress.stateOrProvinceCode || ''} ${coreData.physicalAddress.zipCode || ''}\n`;
          message += `   ${coreData.physicalAddress.countryCode || ''}\n\n`;
        }

        if (pointsOfContact && pointsOfContact.length > 0) {
          message += `👤 Points of Contact:\n`;
          pointsOfContact.slice(0, 3).forEach((poc, i) => {
            message += `   ${i + 1}. ${poc.firstName || ''} ${poc.lastName || ''} (${poc.title || 'N/A'})\n`;
            if (poc.email) message += `      Email: ${poc.email}\n`;
            if (poc.phone) message += `      Phone: ${poc.phone}\n`;
          });
        }

        return {
          success: true,
          message: message,
          data: result,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Entity not found',
          data: null,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get entity details: ${error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'searchSAMGovOpportunities') {
    const { searchOpportunities } = await import('./samGov.js');

    try {
      const searchParams = {
        keyword: args.keyword,
        postedFrom: args.postedFrom,
        postedTo: args.postedTo,
      };

      const result = await searchOpportunities(searchParams, userId);

      let message = `Found ${result.totalRecords} federal contract ${result.totalRecords === 1 ? 'opportunity' : 'opportunities'}`;

      if (result.opportunities && result.opportunities.length > 0) {
        message += '\n\n🔔 Contract Opportunities:\n\n';
        message += result.opportunities.slice(0, 5).map((opp, i) => {
          return `${i + 1}. ${opp.title || 'Untitled'}\n` +
                 `   Type: ${opp.type || 'N/A'}\n` +
                 `   Posted: ${opp.postedDate || 'N/A'}\n` +
                 `   Response Deadline: ${opp.responseDeadLine || 'N/A'}\n` +
                 `   Solicitation: ${opp.solicitationNumber || 'N/A'}`;
        }).join('\n\n');

        if (result.opportunities.length > 5) {
          message += `\n\n...and ${result.opportunities.length - 5} more opportunities`;
        }
      }

      return {
        success: true,
        message: message,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `SAM.gov opportunities search failed: ${error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'getSAMGovExclusions') {
    const { getExclusions } = await import('./samGov.js');

    try {
      const searchParams = {
        name: args.name,
        ueiSAM: args.ueiSAM,
        cageCode: args.cageCode,
      };

      const result = await getExclusions(searchParams, userId);

      let message = `Found ${result.exclusions ? result.exclusions.length : 0} exclusion ${result.exclusions && result.exclusions.length === 1 ? 'record' : 'records'}`;

      if (result.exclusions && result.exclusions.length > 0) {
        message += '\n\n⚠️ Excluded/Debarred Entities:\n\n';
        message += result.exclusions.map((exc, i) => {
          return `${i + 1}. ${exc.name || 'N/A'}\n` +
                 `   UEI: ${exc.ueiSAM || 'N/A'}\n` +
                 `   CAGE Code: ${exc.cageCode || 'N/A'}\n` +
                 `   Exclusion Type: ${exc.exclusionType || 'N/A'}\n` +
                 `   Active Date: ${exc.activeDate || 'N/A'}\n` +
                 `   Termination Date: ${exc.terminationDate || 'N/A'}`;
        }).join('\n\n');
      } else {
        message += '\n\n✅ No exclusions found - entity is eligible for federal contracting';
      }

      return {
        success: true,
        message: message,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `SAM.gov exclusions search failed: ${error.message}`,
        data: null,
      };
    }
  }

  // Internal Opportunity Management Functions
  if (functionName === 'createOpportunity') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const requestBody = {
        notice_id: args.noticeId,
        solicitation_number: args.solicitationNumber,
        title: args.title,
        type: args.type,
        posted_date: args.postedDate,
        response_deadline: args.responseDeadline,
        description: args.description,
        naics_code: args.naicsCode,
        set_aside_type: args.setAsideType,
        contracting_office: args.contractingOffice,
        place_of_performance: args.placeOfPerformance,
        internal_status: args.initialStatus || 'New',
        internal_score: args.initialScore,
        internal_notes: args.initialNotes,
      };

      const response = await axios.post(
        `${API_BASE}/api/opportunities`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${await getUserToken(userId)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const opportunity = response.data.opportunity;

      return {
        success: true,
        message: `✅ Opportunity "${args.title}" saved to tracking system (ID: ${opportunity.id})\nStatus: ${opportunity.internal_status}\nYou can now assign it, score it, and track progress through the pipeline.`,
        data: { opportunity },
      };
    } catch (error) {
      if (error.response?.status === 409) {
        return {
          success: false,
          message: `This opportunity is already in your tracking system (ID: ${error.response.data.id})`,
          data: { opportunityId: error.response.data.id },
        };
      }
      return {
        success: false,
        message: `Failed to create opportunity: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'listOpportunities') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const params = {
        status: args.status,
        assignedTo: args.assignedTo === 'me' ? 'me' : args.assignedTo,
        minScore: args.minScore,
        search: args.search,
        limit: args.limit || 20,
      };

      const response = await axios.get(`${API_BASE}/api/opportunities`, {
        params,
        headers: {
          'Authorization': `Bearer ${await getUserToken(userId)}`,
        }
      });

      const { opportunities, pagination } = response.data;

      let message = `Found ${pagination.total} ${pagination.total === 1 ? 'opportunity' : 'opportunities'}`;

      if (args.status) message += ` with status "${args.status}"`;
      if (args.assignedTo === 'me') message += ` assigned to you`;
      if (args.assignedTo === 'unassigned') message += ` that are unassigned`;
      if (args.minScore) message += ` with score >= ${args.minScore}`;

      if (opportunities.length > 0) {
        message += '\n\n📋 Opportunities:\n\n';
        message += opportunities.map((opp, i) => {
          return `${i + 1}. ${opp.title} (ID: ${opp.id})\n` +
                 `   Status: ${opp.internal_status}` +
                 (opp.internal_score ? ` | Score: ${opp.internal_score}/100` : '') +
                 (opp.assigned_to_name ? ` | Assigned to: ${opp.assigned_to_name}` : ' | Unassigned') + '\n' +
                 `   Posted: ${opp.posted_date ? new Date(opp.posted_date).toLocaleDateString() : 'N/A'}` +
                 (opp.response_deadline ? ` | Deadline: ${new Date(opp.response_deadline).toLocaleDateString()}` : '');
        }).join('\n\n');

        if (pagination.hasMore) {
          message += `\n\n...and ${pagination.total - opportunities.length} more`;
        }
      }

      return {
        success: true,
        message: message,
        data: { opportunities, pagination },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list opportunities: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'getOpportunityDetails') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const response = await axios.get(
        `${API_BASE}/api/opportunities/${args.opportunityId}`,
        {
          headers: {
            'Authorization': `Bearer ${await getUserToken(userId)}`,
          }
        }
      );

      const { opportunity, activity } = response.data;

      let message = `📄 Opportunity Details: ${opportunity.title}\n\n`;
      message += `🔢 ID: ${opportunity.id}\n`;
      message += `📝 Status: ${opportunity.internal_status}\n`;
      message += opportunity.internal_score ? `⭐ Score: ${opportunity.internal_score}/100\n` : '';
      message += opportunity.assigned_to_name ? `👤 Assigned to: ${opportunity.assigned_to_name}\n` : '👤 Unassigned\n';
      message += `📅 Posted: ${opportunity.posted_date ? new Date(opportunity.posted_date).toLocaleDateString() : 'N/A'}\n`;
      message += opportunity.response_deadline ? `⏰ Deadline: ${new Date(opportunity.response_deadline).toLocaleDateString()}\n` : '';
      message += `🔖 Solicitation: ${opportunity.solicitation_number || 'N/A'}\n`;
      message += opportunity.type ? `📋 Type: ${opportunity.type}\n` : '';
      message += opportunity.naics_code ? `🏢 NAICS: ${opportunity.naics_code}\n` : '';
      message += opportunity.set_aside_type ? `🎯 Set-Aside: ${opportunity.set_aside_type}\n` : '';

      if (opportunity.internal_notes) {
        message += `\n📝 Notes:\n${opportunity.internal_notes}\n`;
      }

      if (activity && activity.length > 0) {
        message += `\n\n📊 Recent Activity:\n`;
        message += activity.slice(0, 10).map(act => {
          const date = new Date(act.created_at).toLocaleDateString();
          const user = act.user_name || 'System';
          return `  • ${date} - ${user}: ${act.activity_type} ${act.new_value ? `→ ${act.new_value}` : ''}`;
        }).join('\n');
      }

      return {
        success: true,
        message: message,
        data: { opportunity, activity },
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          message: `Opportunity #${args.opportunityId} not found`,
          data: null,
        };
      }
      return {
        success: false,
        message: `Failed to get opportunity details: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'updateOpportunityStatus') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const response = await axios.patch(
        `${API_BASE}/api/opportunities/${args.opportunityId}/status`,
        {
          status: args.status,
          notes: args.notes,
        },
        {
          headers: {
            'Authorization': `Bearer ${await getUserToken(userId)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const opportunity = response.data.opportunity;

      return {
        success: true,
        message: `✅ Opportunity #${opportunity.id} status updated to "${args.status}"${args.notes ? '\nNote: ' + args.notes : ''}`,
        data: { opportunity },
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          message: `Opportunity #${args.opportunityId} not found`,
          data: null,
        };
      }
      return {
        success: false,
        message: `Failed to update status: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'assignOpportunity') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      // Handle "me" shorthand
      let targetUserId = args.userId;
      if (args.userId === 'me') {
        targetUserId = userId;
      }

      const response = await axios.patch(
        `${API_BASE}/api/opportunities/${args.opportunityId}/assign`,
        {
          userId: targetUserId,
          notes: args.notes,
        },
        {
          headers: {
            'Authorization': `Bearer ${await getUserToken(userId)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const opportunity = response.data.opportunity;
      const assignmentMsg = args.userId === 'me' ? 'you' : (args.userId ? 'user' : 'unassigned');

      return {
        success: true,
        message: `✅ Opportunity #${opportunity.id} ${args.userId ? 'assigned to ' + assignmentMsg : 'unassigned'}${args.notes ? '\nNote: ' + args.notes : ''}`,
        data: { opportunity },
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          message: error.response.data.error || `Opportunity or user not found`,
          data: null,
        };
      }
      return {
        success: false,
        message: `Failed to assign opportunity: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'updateOpportunityScore') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const response = await axios.patch(
        `${API_BASE}/api/opportunities/${args.opportunityId}/score`,
        {
          score: args.score,
          notes: args.notes,
        },
        {
          headers: {
            'Authorization': `Bearer ${await getUserToken(userId)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const opportunity = response.data.opportunity;

      return {
        success: true,
        message: `✅ Opportunity #${opportunity.id} scored as ${args.score}/100${args.notes ? '\nNote: ' + args.notes : ''}`,
        data: { opportunity },
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          message: `Opportunity #${args.opportunityId} not found`,
          data: null,
        };
      }
      return {
        success: false,
        message: `Failed to update score: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'addOpportunityNotes') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const response = await axios.patch(
        `${API_BASE}/api/opportunities/${args.opportunityId}/notes`,
        {
          notes: args.notes,
          append: args.append !== false, // Default to true
        },
        {
          headers: {
            'Authorization': `Bearer ${await getUserToken(userId)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const opportunity = response.data.opportunity;

      return {
        success: true,
        message: `✅ Notes ${args.append !== false ? 'added to' : 'updated for'} opportunity #${opportunity.id}`,
        data: { opportunity },
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          message: `Opportunity #${args.opportunityId} not found`,
          data: null,
        };
      }
      return {
        success: false,
        message: `Failed to update notes: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  if (functionName === 'getOpportunityStats') {
    try {
      const axios = (await import('axios')).default;
      const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

      const params = {};
      if (args.userId === 'me') {
        params.userId = userId;
      } else if (args.userId) {
        params.userId = args.userId;
      }

      const response = await axios.get(`${API_BASE}/api/opportunities/stats/summary`, {
        params,
        headers: {
          'Authorization': `Bearer ${await getUserToken(userId)}`,
        }
      });

      const stats = response.data.stats;

      let message = `📊 Opportunity Pipeline Statistics${args.userId === 'me' ? ' (Your Opportunities)' : ''}\n\n`;
      message += `📈 Total Opportunities: ${stats.total || 0}\n\n`;
      message += `Status Breakdown:\n`;
      message += `  🆕 New: ${stats.new_count || 0}\n`;
      message += `  ✅ Qualified: ${stats.qualified_count || 0}\n`;
      message += `  🔄 In Progress: ${stats.in_progress_count || 0}\n`;
      message += `  📤 Submitted: ${stats.submitted_count || 0}\n`;
      message += `  🏆 Won: ${stats.won_count || 0}\n`;
      message += `  ❌ Lost: ${stats.lost_count || 0}\n\n`;
      message += `👥 Unassigned: ${stats.unassigned_count || 0}\n`;
      message += stats.avg_score ? `⭐ Average Score: ${Math.round(stats.avg_score)}/100` : '';

      return {
        success: true,
        message: message,
        data: { stats },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get opportunity statistics: ${error.response?.data?.error || error.message}`,
        data: null,
      };
    }
  }

  // Performance Monitoring Functions - AI Self-Awareness
  if (functionName === 'getPerformanceMetrics') {
    const monitoringService = (await import('./monitoringService.js')).default;
    
    try {
      const timeRange = args.timeRange || '1 hour';
      const summary = await monitoringService.getPerformanceSummary(timeRange);
      
      return {
        success: true,
        message: `Retrieved performance metrics for the last ${timeRange}`,
        data: {
          timeRange,
          metrics: summary,
          timestamp: new Date().toISOString()
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get performance metrics: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'queryPerformanceMetrics') {
    const monitoringService = (await import('./monitoringService.js')).default;
    
    try {
      const { metricName, timeRange = '1 hour', limit = 100 } = args;
      const metrics = await monitoringService.queryMetrics(metricName, { timeRange, limit });
      
      return {
        success: true,
        message: `Retrieved ${metrics.length} data points for ${metricName}`,
        data: {
          metricName,
          dataPoints: metrics,
          count: metrics.length
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to query performance metrics: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'detectPerformanceAnomalies') {
    const monitoringService = (await import('./monitoringService.js')).default;
    
    try {
      const { metricName, timeRange = '1 hour' } = args;
      const anomalyReport = await monitoringService.detectAnomalies(metricName, timeRange);
      
      if (anomalyReport.hasAnomaly) {
        return {
          success: true,
          message: `Detected ${anomalyReport.anomalies.length} anomaly(ies) in ${metricName}`,
          data: anomalyReport,
        };
      } else {
        return {
          success: true,
          message: `No anomalies detected in ${metricName}`,
          data: anomalyReport,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to detect anomalies: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'getActiveAnomalies') {
    const monitoringService = (await import('./monitoringService.js')).default;
    
    try {
      const { timeRange = '24 hours', minSeverity = 'low' } = args;
      const anomalies = await monitoringService.getActiveAnomalies(timeRange, minSeverity);
      
      return {
        success: true,
        message: anomalies.length > 0 
          ? `Found ${anomalies.length} active anomaly(ies)`
          : 'No active anomalies detected',
        data: {
          anomalies,
          count: anomalies.length,
          timeRange
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get active anomalies: ${error.message}`,
        data: null,
      };
    }
  }
  
  // Gmail functions - users can access their own Gmail via OAuth
  const gmailFunctions = ['readEmails', 'searchEmails', 'sendEmail', 'markEmailAsRead', 'archiveEmail', 'deleteEmail', 'getEmailDetails', 'presentLatestEmail'];
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
  
  if (functionName === 'getEmailDetails') {
    const { getEmailDetails } = await import('./gmail.js');
    
    try {
      const emailDetails = await getEmailDetails(context.user.id, args.emailId);
      
      return {
        success: true,
        message: 'Email details retrieved successfully',
        data: emailDetails,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get email details: ${error.message}`,
        data: null,
      };
    }
  }
  
  if (functionName === 'presentLatestEmail') {
    const { listEmails } = await import('./gmail.js');
    
    try {
      const emails = await listEmails(context.user.id, { maxResults: 1 });
      
      if (!emails || emails.length === 0) {
        return {
          success: false,
          message: 'No emails found in your inbox',
          data: null,
        };
      }
      
      const latestEmail = emails[0];
      
      return {
        success: true,
        message: 'PRESENT_EMAIL_PROTOCOL',
        data: {
          presentation_protocol: 'PRESENT_EMAIL',
          email: latestEmail
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve latest email: ${error.message}`,
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
