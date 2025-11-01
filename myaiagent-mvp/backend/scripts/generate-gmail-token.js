import { google } from 'googleapis';
import readline from 'readline';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels'
];

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

async function generateToken() {
  console.log('\n🔐 Gmail OAuth Setup - Refresh Token Generator\n');
  console.log('This script will help you get a refresh token for Gmail API.\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  try {
    // Get credentials from user
    const clientId = await question('Enter your Google Client ID: ');
    const clientSecret = await question('Enter your Google Client Secret: ');
    
    if (!clientId || !clientSecret) {
      console.error('❌ Error: Client ID and Secret are required');
      rl.close();
      return;
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId.trim(),
      clientSecret.trim(),
      REDIRECT_URI
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force to get refresh token
    });

    console.log('\n📋 STEP 1: Authorize this app');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Open this URL in your browser:\n');
    console.log(authUrl);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const code = await question('Enter the authorization code from the URL: ');
    
    if (!code) {
      console.error('❌ Error: Authorization code is required');
      rl.close();
      return;
    }

    console.log('\n⏳ Exchanging code for tokens...\n');

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code.trim());
    
    console.log('✅ Success! Here are your credentials:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('GOOGLE_CLIENT_ID:', clientId.trim());
    console.log('GOOGLE_CLIENT_SECRET:', clientSecret.trim());
    console.log('GOOGLE_REFRESH_TOKEN:', tokens.refresh_token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📝 Next Steps:');
    console.log('1. Copy the three values above');
    console.log('2. Add them as secrets in Replit');
    console.log('3. The agent will configure your app to use them\n');

    if (!tokens.refresh_token) {
      console.warn('⚠️  Warning: No refresh token received.');
      console.warn('   Make sure you revoke previous access at:');
      console.warn('   https://myaccount.google.com/permissions');
      console.warn('   Then run this script again.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Tip: The authorization code may have expired.');
      console.log('   Please run the script again and use the code immediately.\n');
    }
  } finally {
    rl.close();
  }
}

generateToken();
