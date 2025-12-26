export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,

  scopes: [
    // User Profile
    'openid',
    'email',
    'profile',

    // Gmail API - Full access (Master Scope)
    'https://mail.google.com/',

    // Calendar API
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',

    // Drive API
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',

    // Docs API
    'https://www.googleapis.com/auth/documents',

    // Sheets API
    'https://www.googleapis.com/auth/spreadsheets',
  ],

  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',

  // Token refresh buffer (refresh 5 minutes before expiry)
  tokenRefreshBuffer: 5 * 60 * 1000,
};
