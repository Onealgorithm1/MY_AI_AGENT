export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  
  scopes: [
    // User Profile
    'openid',
    'email',
    'profile',
    
    // Gmail API - Full access
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.labels',
    
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
    
    // Google Analytics
    'https://www.googleapis.com/auth/analytics.readonly',
    
    // Google Ads
    'https://www.googleapis.com/auth/adwords',
  ],
  
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  
  // Token refresh buffer (refresh 5 minutes before expiry)
  tokenRefreshBuffer: 5 * 60 * 1000,
};
