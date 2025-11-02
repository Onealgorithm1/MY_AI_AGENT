import { google } from 'googleapis';
import { tokenManager } from './tokenManager.js';

/**
 * Get authenticated Calendar client for a user
 */
async function getCalendarClient(userId) {
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
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * List upcoming calendar events
 */
export async function listEvents(userId, options = {}) {
  try {
    const calendar = await getCalendarClient(userId);
    
    const { maxResults = 10, timeMin, timeMax } = options;
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || undefined,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items.map(event => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location,
      attendees: event.attendees?.map(a => a.email) || [],
      htmlLink: event.htmlLink,
    }));
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Calendar access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Calendar access denied. Please grant Calendar permissions in Settings.');
    }
    throw new Error(`Calendar API error: ${error.message}`);
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(userId, eventData) {
  try {
    const calendar = await getCalendarClient(userId);
    
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startTime,
      },
      end: {
        dateTime: eventData.endTime,
      },
      attendees: eventData.attendees?.map(email => ({ email })) || [],
    };
    
    // Add timezone if provided
    if (eventData.timeZone) {
      event.start.timeZone = eventData.timeZone;
      event.end.timeZone = eventData.timeZone;
    }
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      start: response.data.start.dateTime,
      end: response.data.end.dateTime,
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Calendar access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Calendar access denied. Please grant Calendar permissions in Settings.');
    }
    throw new Error(`Calendar API error: ${error.message}`);
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(userId, eventId) {
  try {
    const calendar = await getCalendarClient(userId);
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
    
    return { success: true, eventId };
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Google Calendar access token expired. Please reconnect your Google account in Settings.');
    }
    if (error.response?.status === 403) {
      throw new Error('Calendar access denied. Please grant Calendar permissions in Settings.');
    }
    if (error.response?.status === 404) {
      throw new Error('Event not found. It may have already been deleted.');
    }
    throw new Error(`Calendar API error: ${error.message}`);
  }
}
